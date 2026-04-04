"""
Fetch and merge extra Chinese vocabulary and phrase data with strict quality gates.

Sources:
1) CEDICT (MDBG export) for vocabulary candidates
2) Tatoeba API (cmn -> vie) for sentence/phrase pairs

Usage:
  python fetch_chinese_extra_data.py
  python fetch_chinese_extra_data.py --target-words 800 --target-phrases 1500
"""

from __future__ import annotations

import argparse
import datetime as dt
import gzip
import io
import json
import random
import re
import time
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

import requests

ROOT = Path(__file__).resolve().parent
WORDS_FILE = ROOT / "chinese_words.json"
PHRASES_FILE = ROOT / "chinese_phrases.json"

CEDICT_URL = "https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz"
TATOEBA_URL = "https://tatoeba.org/en/api_v0/search"
MYMEMORY_URL = "https://api.mymemory.translated.net/get"

CJK_RE = re.compile(r"[\u3400-\u9fff]")
WORD_CJK_ONLY_RE = re.compile(r"^[\u3400-\u9fff]+$")
ASCII_ONLY_RE = re.compile(r"^[A-Za-z0-9 ,.;:/\\-]+$")
VN_DIAC_RE = re.compile(
    r"[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡ"
    r"ùúụủũưừứựửữỳýỵỷỹđ"
    r"ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ"
    r"ÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]"
)

CEDICT_LINE_RE = re.compile(r"^(\S+)\s+(\S+)\s+\[(.+?)\]\s+/(.+)/$")

BAD_DEF_HINTS = (
    "surname",
    "variant of",
    "old variant",
    "abbr.",
    "kangxi radical",
    "used in",
)

LEGACY_LEVEL_MAP = {
    "A1": "HSK1",
    "A2": "HSK2",
    "B1": "HSK3",
    "B2": "HSK4",
    "HSK1": "HSK1",
    "HSK2": "HSK2",
    "HSK3": "HSK3",
    "HSK4": "HSK4",
    "HSK5": "HSK5",
    "HSK6": "HSK6",
}

KNOWN_CATEGORY_ORDER = [
    "greetings",
    "family",
    "food",
    "travel",
    "shopping",
    "work",
    "study",
    "health",
    "time",
    "weather",
    "housing",
    "transport",
    "technology",
    "business",
    "finance",
    "culture",
    "emotion",
    "society",
    "environment",
    "law",
    "daily",
]

CATEGORY_RULES = {
    "greetings": {
        "zh": ("你好", "您好", "谢谢", "对不起", "再见", "请问", "早上好", "晚上好"),
        "vi": ("xin chào", "cảm ơn", "xin lỗi", "tạm biệt", "chào", "làm ơn"),
    },
    "family": {
        "zh": ("妈妈", "爸爸", "家人", "家庭", "姐姐", "哥哥", "弟弟", "妹妹", "儿子", "女儿", "奶奶", "爷爷", "妻子", "丈夫"),
        "vi": ("gia đình", "mẹ", "bố", "ba", "cha", "con trai", "con gái", "ông", "bà", "vợ", "chồng"),
    },
    "food": {
        "zh": ("吃", "喝", "饭", "菜", "水", "茶", "咖啡", "面包", "牛奶", "水果", "鸡蛋", "肉"),
        "vi": ("ăn", "uống", "cơm", "món", "thức ăn", "nước", "trà", "cà phê", "bánh", "sữa", "trái cây", "rau", "thịt"),
    },
    "travel": {
        "zh": ("车", "站", "地铁", "飞机", "机场", "票", "酒店", "旅游", "路", "北京", "上海"),
        "vi": ("xe", "tàu", "ga", "sân bay", "vé", "khách sạn", "du lịch", "đường", "đi lại"),
    },
    "work": {
        "zh": ("工作", "上班", "公司", "会议", "开会", "老板", "同事", "办公室"),
        "vi": ("công việc", "đi làm", "công ty", "họp", "sếp", "đồng nghiệp", "văn phòng"),
    },
    "study": {
        "zh": ("学习", "学校", "老师", "学生", "课", "作业", "考试", "图书馆", "中文"),
        "vi": ("học", "trường", "giáo viên", "học sinh", "sinh viên", "bài tập", "kiểm tra", "thư viện", "tiếng trung"),
    },
    "shopping": {
        "zh": ("买", "卖", "钱", "元", "商店", "商场", "便宜", "贵", "多少"),
        "vi": ("mua", "bán", "tiền", "bao nhiêu", "cửa hàng", "siêu thị", "đắt", "rẻ"),
    },
    "health": {
        "zh": ("医院", "医生", "病", "药", "身体", "休息", "疼"),
        "vi": ("bệnh viện", "bác sĩ", "bệnh", "thuốc", "sức khỏe", "đau", "nghỉ"),
    },
    "time": {
        "zh": ("今天", "明天", "昨天", "现在", "时间", "早上", "下午", "晚上", "星期", "年", "月", "日", "点", "分"),
        "vi": ("hôm nay", "ngày mai", "hôm qua", "bây giờ", "thời gian", "buổi sáng", "buổi chiều", "buổi tối", "tuần", "tháng", "năm", "giờ", "phút"),
    },
    "weather": {
        "zh": ("天气", "下雨", "下雪", "晴天", "阴天", "刮风", "温度", "热", "冷", "台风"),
        "vi": ("thời tiết", "mưa", "nắng", "gió", "nhiệt độ", "nóng", "lạnh", "bão"),
    },
    "housing": {
        "zh": ("房子", "公寓", "租", "搬家", "客厅", "厨房", "卧室", "厕所", "家具", "门"),
        "vi": ("nhà", "căn hộ", "thuê", "chuyển nhà", "phòng khách", "nhà bếp", "phòng ngủ", "nhà vệ sinh", "nội thất"),
    },
    "transport": {
        "zh": ("公交", "地铁", "高铁", "出租车", "火车", "飞机", "站", "路线", "堵车", "票"),
        "vi": ("xe buýt", "tàu điện", "tàu cao tốc", "taxi", "ga", "chuyến bay", "tuyến", "kẹt xe", "vé"),
    },
    "technology": {
        "zh": ("手机", "电脑", "网络", "软件", "程序", "系统", "数据", "密码", "下载", "上传"),
        "vi": ("điện thoại", "máy tính", "mạng", "phần mềm", "hệ thống", "dữ liệu", "mật khẩu", "tải xuống", "tải lên"),
    },
    "business": {
        "zh": ("项目", "合作", "客户", "合同", "会议", "市场", "公司", "经理", "团队", "业绩"),
        "vi": ("dự án", "hợp tác", "khách hàng", "hợp đồng", "họp", "thị trường", "công ty", "quản lý", "đội nhóm", "hiệu suất"),
    },
    "finance": {
        "zh": ("银行", "贷款", "利率", "存款", "收入", "支出", "预算", "投资", "股票", "现金"),
        "vi": ("ngân hàng", "vay", "lãi suất", "tiền gửi", "thu nhập", "chi tiêu", "ngân sách", "đầu tư", "cổ phiếu", "tiền mặt"),
    },
    "culture": {
        "zh": ("文化", "历史", "传统", "节日", "艺术", "音乐", "电影", "博物馆", "习俗", "文学"),
        "vi": ("văn hóa", "lịch sử", "truyền thống", "lễ hội", "nghệ thuật", "âm nhạc", "phim", "bảo tàng", "phong tục", "văn học"),
    },
    "emotion": {
        "zh": ("开心", "难过", "紧张", "害怕", "生气", "担心", "放松", "激动", "失望", "满意"),
        "vi": ("vui", "buồn", "căng thẳng", "sợ", "tức giận", "lo lắng", "thư giãn", "hào hứng", "thất vọng", "hài lòng"),
    },
    "society": {
        "zh": ("社会", "政策", "教育", "医疗", "公共", "城市", "农村", "人口", "服务", "治理"),
        "vi": ("xã hội", "chính sách", "giáo dục", "y tế", "công cộng", "thành phố", "nông thôn", "dân số", "dịch vụ", "quản lý"),
    },
    "environment": {
        "zh": ("环境", "污染", "垃圾", "回收", "保护", "能源", "森林", "海洋", "气候", "碳"),
        "vi": ("môi trường", "ô nhiễm", "rác", "tái chế", "bảo vệ", "năng lượng", "rừng", "biển", "khí hậu", "carbon"),
    },
    "law": {
        "zh": ("法律", "法规", "警察", "法院", "证据", "违法", "处罚", "合同", "权利", "责任"),
        "vi": ("pháp luật", "quy định", "cảnh sát", "tòa án", "chứng cứ", "vi phạm", "xử phạt", "quyền", "trách nhiệm"),
    },
}

CORE_WORD_CAP_LEVEL = {
    # Core pronouns / function words / greetings should never drift to high HSK.
    "我": 1,
    "你": 1,
    "他": 1,
    "她": 1,
    "它": 1,
    "我们": 1,
    "你们": 1,
    "他们": 1,
    "她们": 1,
    "是": 1,
    "不": 1,
    "有": 1,
    "在": 1,
    "的": 1,
    "了": 1,
    "吗": 1,
    "呢": 1,
    "这": 1,
    "那": 1,
    "谁": 1,
    "什么": 1,
    "哪": 1,
    "哪儿": 1,
    "哪里": 1,
    "请": 1,
    "谢谢": 1,
    "对不起": 1,
    "再见": 1,
    "你好": 1,
    "您好": 1,
    "请问": 1,
    "没关系": 1,
    "不用谢": 1,
    "一": 1,
    "二": 1,
    "三": 1,
    "四": 1,
    "五": 1,
    "六": 1,
    "七": 1,
    "八": 1,
    "九": 1,
    "十": 1,
    "今天": 2,
    "明天": 2,
    "昨天": 2,
    "现在": 2,
}

CORE_PHRASE_CAP_LEVEL = {
    "你好": 1,
    "您好": 1,
    "谢谢": 1,
    "谢谢你": 1,
    "对不起": 1,
    "再见": 1,
    "请问": 1,
    "没关系": 1,
    "不用谢": 1,
    "你好吗": 1,
    "我很好": 1,
    "早上好": 2,
    "晚上好": 2,
    "早安": 2,
    "晚安": 2,
}

ADVANCED_MARKERS = (
    "虽然",
    "但是",
    "因为",
    "所以",
    "如果",
    "已经",
    "正在",
    "并且",
    "而且",
    "尽管",
    "无论",
    "否则",
    "然而",
    "仍然",
    "甚至",
    "不仅",
    "而是",
    "之一",
)

ZH_STRIP_RE = re.compile(r"[\s，。！？!?；：、（）()【】\[\]《》\"“”‘’'…,.-]")

PHRASE_LEVEL_WEIGHTS = [0.26, 0.22, 0.18, 0.15, 0.12, 0.07]

QUERY_SEED_POOLS = {
    "greetings": ["你好", "谢谢", "请问", "再见", "没关系", "不用谢", "打招呼"],
    "family": ["家人", "妈妈", "爸爸", "哥哥", "姐姐", "孩子", "家庭"],
    "food": ["吃饭", "喝", "餐厅", "点菜", "面包", "米饭", "水果", "咖啡"],
    "travel": ["旅游", "酒店", "景点", "护照", "航班", "行李", "路线", "地图"],
    "shopping": ["买", "卖", "价格", "打折", "付款", "现金", "退货", "商场"],
    "work": ["工作", "上班", "同事", "会议", "任务", "报告", "办公室", "加班"],
    "study": ["学习", "学校", "老师", "作业", "考试", "课堂", "练习", "成绩"],
    "health": ["医院", "医生", "生病", "药", "休息", "检查", "疼", "健康"],
    "time": ["今天", "明天", "昨天", "现在", "以后", "以前", "早上", "晚上"],
    "weather": ["天气", "下雨", "下雪", "晴天", "阴天", "温度", "刮风", "台风"],
    "housing": ["房子", "租房", "搬家", "客厅", "卧室", "厨房", "邻居", "家电"],
    "transport": ["地铁", "公交", "高铁", "堵车", "车站", "出租车", "换乘", "车票"],
    "technology": ["手机", "电脑", "网络", "软件", "系统", "数据", "密码", "下载"],
    "business": ["项目", "合作", "客户", "合同", "市场", "团队", "业绩", "方案"],
    "finance": ["银行", "贷款", "利率", "预算", "收入", "支出", "投资", "股票"],
    "culture": ["文化", "传统", "节日", "历史", "艺术", "音乐", "电影", "文学"],
    "emotion": ["开心", "难过", "担心", "紧张", "生气", "放松", "满意", "失望"],
    "society": ["社会", "政策", "公共", "教育", "服务", "城市", "农村", "人口"],
    "environment": ["环境", "污染", "回收", "保护", "能源", "森林", "海洋", "气候"],
    "law": ["法律", "法院", "警察", "违法", "处罚", "证据", "权利", "责任"],
}

QUERY_LEVEL_SEEDS = {
    "HSK1": ["你", "我", "他", "她", "我们", "你们", "喜欢", "会", "要", "可以"],
    "HSK2": ["因为", "所以", "如果", "已经", "正在", "还是", "比较", "应该"],
    "HSK3": ["虽然", "但是", "除了", "不仅", "而且", "例如", "结果", "情况"],
    "HSK4": ["尽管", "然而", "因此", "逐渐", "影响", "提高", "保持", "方式"],
    "HSK5": ["无论", "否则", "一方面", "另一方面", "观点", "结构", "效率", "机制"],
    "HSK6": ["可持续", "治理", "战略", "创新", "协同", "转型", "风险", "伦理"],
}


class FetchError(RuntimeError):
    pass


def normalize_text(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def phrase_key(zh: str, vi: str) -> str:
    zh_norm = re.sub(r"\s+", "", normalize_text(zh))
    vi_norm = re.sub(r"\s+", "", normalize_text(vi))
    return f"{zh_norm}|{vi_norm}"


def now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


def unique_keep_order(items: Iterable[str]) -> List[str]:
    seen: set[str] = set()
    out: List[str] = []
    for item in items:
        token = str(item or "").strip()
        if not token or token in seen:
            continue
        seen.add(token)
        out.append(token)
    return out


def normalize_category_names(categories: Iterable[str]) -> List[str]:
    norm: List[str] = []
    allowed = set(KNOWN_CATEGORY_ORDER)
    for cat in categories:
        token = str(cat or "").strip().lower()
        if not token or token not in allowed:
            continue
        norm.append(token)
    return unique_keep_order(norm)


def parse_csv_categories(raw: str) -> List[str]:
    if not raw:
        return []
    return normalize_category_names(x.strip() for x in raw.split(","))


def category_counter(phrases: List[dict]) -> Dict[str, int]:
    out: Dict[str, int] = {}
    for p in phrases:
        cat = str(p.get("category", "daily")).strip().lower() or "daily"
        out[cat] = out.get(cat, 0) + 1
    return out


def print_category_snapshot(label: str, phrases: List[dict], top_n: int = 12) -> None:
    cnt = category_counter(phrases)
    ordered = sorted(cnt.items(), key=lambda x: x[1], reverse=True)
    print(f"{label}: {ordered[:max(1, top_n)]}")


def clean_phrase_rows(phrases: List[dict], remove_english_like_vi: bool) -> Tuple[List[dict], Dict[str, int]]:
    stats = {
        "dropped_missing_zh": 0,
        "dropped_missing_vi": 0,
        "dropped_non_cjk_zh": 0,
        "dropped_english_like_vi": 0,
        "dropped_duplicate": 0,
    }
    seen: set[str] = set()
    cleaned: List[dict] = []

    for row in phrases:
        zh = str(row.get("zh", "")).strip()
        vi = str(row.get("vi", "")).strip()
        if not zh:
            stats["dropped_missing_zh"] += 1
            continue
        if not vi:
            stats["dropped_missing_vi"] += 1
            continue
        if not CJK_RE.search(zh):
            stats["dropped_non_cjk_zh"] += 1
            continue
        if remove_english_like_vi and ASCII_ONLY_RE.fullmatch(vi):
            stats["dropped_english_like_vi"] += 1
            continue

        key = phrase_key(zh, vi)
        if key in seen:
            stats["dropped_duplicate"] += 1
            continue
        seen.add(key)

        row["zh"] = zh
        row["vi"] = vi
        cleaned.append(row)

    return cleaned, stats


def build_query_seeds(
    seed_limit: int = 600,
    focus_categories: Optional[List[str]] = None,
    focus_multiplier: int = 4,
) -> List[str]:
    focus_categories = normalize_category_names(focus_categories or [])

    focus_front: List[str] = []
    if focus_categories:
        reps = max(1, int(focus_multiplier))
        for _ in range(reps):
            for cat in focus_categories:
                focus_front.extend(QUERY_SEED_POOLS.get(cat, []))

    # Round-robin category seeds to avoid over-fetching only daily-style sentences.
    category_lists: List[List[str]] = [list(QUERY_SEED_POOLS.get(cat, [])) for cat in KNOWN_CATEGORY_ORDER if cat != "daily"]
    merged: List[str] = []
    depth = 0
    while True:
        pushed = False
        for arr in category_lists:
            if depth < len(arr):
                merged.append(arr[depth])
                pushed = True
        if not pushed:
            break
        depth += 1

    level_seeds: List[str] = []
    for lv in ["HSK1", "HSK2", "HSK3", "HSK4", "HSK5", "HSK6"]:
        level_seeds.extend(QUERY_LEVEL_SEEDS.get(lv, []))

    # Add sampled HSK words from existing vocabulary to broaden retrieval space.
    sampled_words: List[str] = []
    try:
        rng = random.Random(20260404)
        words = load_words()
        lv_map: Dict[int, List[str]] = {i: [] for i in range(1, 7)}
        for row in words:
            token = str(row.get("word", "")).strip()
            if not token or not WORD_CJK_ONLY_RE.match(token):
                continue
            if len(token) > 4:
                continue
            lv = normalize_hsk_level(row.get("level"), fallback=normalize_hsk_level(row.get("hskLevel"), fallback=3))
            lv = max(1, min(6, lv))
            lv_map[lv].append(token)

        for lv in range(1, 7):
            items = unique_keep_order(lv_map.get(lv, []))
            if not items:
                continue
            rng.shuffle(items)
            sampled_words.extend(items[:45])
    except Exception:
        sampled_words = []

    seeds = unique_keep_order(focus_front + merged + level_seeds + sampled_words)
    return seeds[: max(1, int(seed_limit))]


def load_words() -> List[dict]:
    return json.loads(WORDS_FILE.read_text(encoding="utf-8"))


def load_phrases() -> Dict[str, object]:
    return json.loads(PHRASES_FILE.read_text(encoding="utf-8"))


def max_word_id(words: List[dict]) -> int:
    max_id = 0
    for w in words:
        m = re.match(r"^zw_(\d+)$", str(w.get("id", "")))
        if m:
            max_id = max(max_id, int(m.group(1)))
    return max_id


def max_phrase_id(phrases: List[dict]) -> int:
    max_id = 0
    for p in phrases:
        m = re.match(r"^cp_(\d+)$", str(p.get("id", "")))
        if m:
            max_id = max(max_id, int(m.group(1)))
    return max_id


def quality_report_words(words: List[dict]) -> Dict[str, int]:
    rep = {
        "total": len(words),
        "missing_word": 0,
        "missing_pinyin": 0,
        "missing_meaning": 0,
        "non_cjk_word": 0,
        "dup_word_rows": 0,
    }
    counter: Dict[str, int] = {}
    for w in words:
        word = str(w.get("word", "")).strip()
        pinyin = str(w.get("pinyin", "")).strip()
        meaning = str(w.get("meaning", "")).strip()
        if not word:
            rep["missing_word"] += 1
        if not pinyin:
            rep["missing_pinyin"] += 1
        if not meaning:
            rep["missing_meaning"] += 1
        if word and not WORD_CJK_ONLY_RE.match(word):
            rep["non_cjk_word"] += 1
        if word:
            counter[word] = counter.get(word, 0) + 1

    rep["dup_word_rows"] = sum(v - 1 for v in counter.values() if v > 1)
    return rep


def quality_report_phrases(phrases: List[dict]) -> Dict[str, int]:
    rep = {
        "total": len(phrases),
        "missing_zh": 0,
        "missing_vi": 0,
        "non_cjk_zh": 0,
        "dup_phrase_rows": 0,
        "english_like_vi": 0,
    }
    counter: Dict[Tuple[str, str], int] = {}
    for p in phrases:
        zh = str(p.get("zh", "")).strip()
        vi = str(p.get("vi", "")).strip()
        if not zh:
            rep["missing_zh"] += 1
        if not vi:
            rep["missing_vi"] += 1
        if zh and not CJK_RE.search(zh):
            rep["non_cjk_zh"] += 1
        if vi and ASCII_ONLY_RE.fullmatch(vi):
            rep["english_like_vi"] += 1
        if zh and vi:
            k = (zh, vi)
            counter[k] = counter.get(k, 0) + 1

    rep["dup_phrase_rows"] = sum(v - 1 for v in counter.values() if v > 1)
    return rep


def is_good_vi_text(text: str) -> bool:
    t = (text or "").strip()
    if not t:
        return False
    bad_prefix = ("PLEASE", "MYMEMORY WARNING", "SELECT", "{" )
    if t.upper().startswith(bad_prefix):
        return False
    if t == "?":
        return False
    return True


def infer_level_from_length(zh: str) -> Tuple[int, str]:
    compact = re.sub(r"\s+", "", zh)
    n = len(compact)
    marker_hits = sum(1 for mk in ADVANCED_MARKERS if mk in compact)

    if n <= 3 and marker_hits == 0:
        return 1, "HSK1"
    if n <= 6 and marker_hits <= 1:
        return 2, "HSK2"
    if n <= 10 and marker_hits <= 2:
        return 3, "HSK3"
    if n <= 16 and marker_hits <= 3:
        return 4, "HSK4"
    if n <= 24 and marker_hits <= 4:
        return 5, "HSK5"
    return 6, "HSK6"


def normalize_hsk_level(value: object, fallback: int = 1) -> int:
    token = str(value or "").strip().upper()
    if token in LEGACY_LEVEL_MAP:
        token = LEGACY_LEVEL_MAP[token]
    m = re.fullmatch(r"HSK([1-6])", token)
    if m:
        return int(m.group(1))
    if isinstance(value, int) and 1 <= int(value) <= 6:
        return int(value)
    return max(1, min(6, int(fallback)))


def hsk_label(level_num: int) -> str:
    n = max(1, min(6, int(level_num)))
    return f"HSK{n}"


def equal_level_buckets(total: int) -> List[int]:
    base = total // 6
    rem = total % 6
    return [base + (1 if i < rem else 0) for i in range(6)]


def weighted_level_buckets(total: int, weights: List[float]) -> List[int]:
    if total <= 0:
        return [0] * 6

    if len(weights) != 6:
        return equal_level_buckets(total)

    w_sum = sum(max(0.0, w) for w in weights)
    if w_sum <= 0:
        return equal_level_buckets(total)

    norm = [max(0.0, w) / w_sum for w in weights]
    raw = [total * w for w in norm]
    base = [int(x) for x in raw]
    remainder = total - sum(base)

    frac_order = sorted(range(6), key=lambda i: (raw[i] - base[i]), reverse=True)
    for i in range(remainder):
        base[frac_order[i % 6]] += 1
    return base


def normalize_zh_compact(text: str) -> str:
    return ZH_STRIP_RE.sub("", str(text or "")).strip()


def choose_anchor_level(cap_level: int, capacities: List[int]) -> Optional[int]:
    cap = max(1, min(6, int(cap_level)))
    preferred = cap
    ordered = [preferred]
    ordered.extend(range(preferred - 1, 0, -1))
    ordered.extend(range(preferred + 1, cap + 1))
    for lv in ordered:
        if capacities[lv - 1] > 0:
            return lv
    return None


def assign_balanced_levels(
    items: List[dict],
    sort_key_fn,
    cap_fn,
    capacities_override: Optional[List[int]] = None,
) -> List[int]:
    total = len(items)
    if total == 0:
        return []

    buckets = capacities_override[:] if capacities_override and len(capacities_override) == 6 else equal_level_buckets(total)
    capacities = buckets[:]
    assigned: List[Optional[int]] = [None] * total

    anchor_indices = [idx for idx in range(total) if cap_fn(items[idx]) < 6]
    anchor_indices.sort(key=lambda i: (cap_fn(items[i]), sort_key_fn(items[i]), i))

    for idx in anchor_indices:
        cap = cap_fn(items[idx])
        lv = choose_anchor_level(cap, capacities)
        if lv is None:
            continue
        assigned[idx] = lv
        capacities[lv - 1] -= 1

    remaining = [idx for idx in range(total) if assigned[idx] is None]
    remaining.sort(key=lambda i: (sort_key_fn(items[i]), i))

    cursor = 0
    for lv in range(1, 7):
        slot = capacities[lv - 1]
        for _ in range(slot):
            if cursor >= len(remaining):
                break
            assigned[remaining[cursor]] = lv
            cursor += 1

    # Safety fallback (should not happen, but keeps data consistent).
    for i, lv in enumerate(assigned):
        if lv is None:
            assigned[i] = 6

    return [int(x) for x in assigned]


def rebalance_words_hsk_levels(words: List[dict]) -> None:
    def word_sort_key(w: dict) -> Tuple[int, int, int, str]:
        token = str(w.get("word", "")).strip()
        token_len = len(token)
        level_num = normalize_hsk_level(
            w.get("level"),
            fallback=normalize_hsk_level(w.get("hskLevel"), fallback=3),
        )
        pinyin = str(w.get("pinyin", ""))
        syllables = len([x for x in pinyin.split(" ") if x.strip()])
        score = token_len * 20 + max(0, syllables - 1) * 5 + level_num * 2
        return score, token_len, level_num, token

    def word_cap_level(w: dict) -> int:
        token = str(w.get("word", "")).strip()
        return CORE_WORD_CAP_LEVEL.get(token, 6)

    assigned = assign_balanced_levels(words, word_sort_key, word_cap_level)
    for idx, lv in enumerate(assigned):
        words[idx]["hskLevel"] = lv
        words[idx]["level"] = hsk_label(lv)


def classify_phrase_category(zh: str, vi: str, current: str) -> str:
    zh_text = str(zh or "")
    vi_text = normalize_text(str(vi or ""))

    best_cat = "daily"
    best_score = 0
    for cat in KNOWN_CATEGORY_ORDER:
        if cat == "daily":
            continue
        rule = CATEGORY_RULES.get(cat, {})
        score = 0
        for kw in rule.get("zh", ()):  # type: ignore[arg-type]
            if kw and kw in zh_text:
                score += 1
        for kw in rule.get("vi", ()):  # type: ignore[arg-type]
            if kw and kw in vi_text:
                score += 1
        if score > best_score:
            best_cat = cat
            best_score = score

    return best_cat


def rebalance_phrases_levels_and_categories(phrases: List[dict]) -> None:
    for p in phrases:
        p["category"] = classify_phrase_category(
            str(p.get("zh", "")),
            str(p.get("vi", "")),
            str(p.get("category", "daily")),
        )

    def phrase_sort_key(p: dict) -> Tuple[int, int, int, int, str]:
        zh_raw = str(p.get("zh", ""))
        zh = normalize_zh_compact(zh_raw)
        vi = normalize_text(str(p.get("vi", "")) or "")
        vi_words = len([x for x in vi.split(" ") if x])
        level_num = normalize_hsk_level(
            p.get("level"),
            fallback=normalize_hsk_level(p.get("hskLevel"), fallback=3),
        )
        marker_bonus = sum(1 for mk in ADVANCED_MARKERS if mk in zh_raw) * 8
        complexity = len(zh) * 8 + vi_words * 2 + marker_bonus + level_num * 2
        return complexity, len(zh), vi_words, level_num, zh

    def phrase_cap_level(p: dict) -> int:
        zh_compact = normalize_zh_compact(str(p.get("zh", "")))
        if not zh_compact:
            return 6
        if zh_compact in CORE_PHRASE_CAP_LEVEL:
            return CORE_PHRASE_CAP_LEVEL[zh_compact]
        if len(zh_compact) <= 4 and any(k in zh_compact for k in ("你好", "您好", "谢谢", "对不起", "再见", "请问")):
            return 2
        return 6

    buckets = weighted_level_buckets(len(phrases), PHRASE_LEVEL_WEIGHTS)
    assigned = assign_balanced_levels(
        phrases,
        phrase_sort_key,
        phrase_cap_level,
        capacities_override=buckets,
    )
    for idx, lv in enumerate(assigned):
        phrases[idx]["hskLevel"] = lv
        phrases[idx]["level"] = hsk_label(lv)


def apply_rebalance(words: List[dict], phrases: List[dict]) -> None:
    rebalance_words_hsk_levels(words)
    rebalance_phrases_levels_and_categories(phrases)


def translate_zh_to_vi(session: requests.Session, zh: str, retries: int = 3) -> Optional[str]:
    for i in range(retries):
        try:
            r = session.get(
                MYMEMORY_URL,
                params={"q": zh, "langpair": "zh-CN|vi"},
                timeout=15,
            )
            r.raise_for_status()
            data = r.json()
            txt = str((data.get("responseData") or {}).get("translatedText") or "").strip()
            if is_good_vi_text(txt) and normalize_text(txt) != normalize_text(zh):
                return txt
        except Exception:
            pass
        time.sleep(0.5 * (i + 1))
    return None


def fetch_cedict_raw(session: requests.Session) -> str:
    r = session.get(CEDICT_URL, timeout=40)
    r.raise_for_status()
    with gzip.GzipFile(fileobj=io.BytesIO(r.content)) as gz:
        data = gz.read().decode("utf-8", errors="ignore")
    return data


def choose_best_def(def_block: str) -> Optional[str]:
    defs = [d.strip() for d in def_block.split("/") if d.strip()]
    cleaned: List[str] = []
    for d in defs:
        d2 = re.sub(r"\([^)]*\)", "", d).strip()
        if not d2:
            continue
        low = d2.lower()
        if any(h in low for h in BAD_DEF_HINTS):
            continue
        cleaned.append(d2)

    if not cleaned:
        return None
    cleaned.sort(key=len)
    return cleaned[0]


def collect_word_candidates(
    cedict_raw: str,
    existing_words: set,
    target_count: int,
) -> List[Tuple[str, str]]:
    candidates: List[Tuple[str, str]] = []
    seen = set(existing_words)

    lines = cedict_raw.splitlines()
    random.shuffle(lines)
    for line in lines:
        if line.startswith("#"):
            continue
        m = CEDICT_LINE_RE.match(line)
        if not m:
            continue
        simp = m.group(2).strip()
        pinyin = m.group(3).strip()
        def_block = m.group(4).strip()

        if simp in seen:
            continue
        if not WORD_CJK_ONLY_RE.match(simp):
            continue
        if not (1 <= len(simp) <= 4):
            continue
        if not pinyin:
            continue

        english_def = choose_best_def(def_block)
        if not english_def:
            continue
        if len(english_def) > 50:
            continue

        seen.add(simp)
        candidates.append((simp, pinyin))
        if len(candidates) >= target_count * 2:
            break

    return candidates


def extract_transcription(sentence: dict) -> str:
    trans = sentence.get("transcriptions") or []
    if not isinstance(trans, list):
        return ""
    for item in trans:
        if not isinstance(item, dict):
            continue
        text = str(item.get("text") or "").strip()
        if text:
            return text
    return ""


def first_vie_translation(sentence: dict) -> Optional[str]:
    groups = sentence.get("translations") or []
    if not isinstance(groups, list):
        return None

    candidates: List[str] = []
    for group in groups:
        if not isinstance(group, list):
            continue
        for item in group:
            if not isinstance(item, dict):
                continue
            if item.get("lang") != "vie":
                continue
            txt = str(item.get("text") or "").strip()
            if txt:
                candidates.append(txt)

    if not candidates:
        return None

    # Prefer clean Vietnamese text with diacritics, then shortest reasonable one.
    candidates.sort(key=lambda x: (0 if VN_DIAC_RE.search(x) else 1, len(x)))
    return candidates[0]


def is_good_phrase_pair(zh: str, vi: str) -> bool:
    z = zh.strip()
    v = vi.strip()
    if not z or not v:
        return False
    if not CJK_RE.search(z):
        return False
    if len(z) < 2 or len(z) > 40:
        return False
    if len(v) < 2 or len(v) > 120:
        return False
    if "___" in z:
        return False
    if not is_good_vi_text(v):
        return False
    if normalize_text(z) == normalize_text(v):
        return False
    return True


def fetch_tatoeba_pairs(
    session: requests.Session,
    target_count: int,
    existing_keys: set,
    seeds: List[str],
    max_pages_per_seed: int,
) -> List[Tuple[str, str, str]]:
    pairs: List[Tuple[str, str, str]] = []
    seen_keys = set(existing_keys)

    for seed in seeds:
        for page in range(1, max(1, max_pages_per_seed) + 1):
            try:
                r = session.get(
                    TATOEBA_URL,
                    params={"from": "cmn", "to": "vie", "query": seed, "page": page},
                    timeout=20,
                )
                r.raise_for_status()
                payload = r.json()
            except KeyboardInterrupt:
                # Allow manual stop while preserving already collected pairs.
                print(f"Interrupted while fetching Tatoeba, keeping {len(pairs)} collected phrase pairs.")
                return pairs
            except Exception:
                time.sleep(0.3)
                continue

            results = payload.get("results") or []
            if not results:
                break

            for item in results:
                if not isinstance(item, dict):
                    continue
                zh = str(item.get("text") or "").strip()
                vi = first_vie_translation(item) or ""
                if not is_good_phrase_pair(zh, vi):
                    continue
                k = phrase_key(zh, vi)
                if k in seen_keys:
                    continue
                seen_keys.add(k)
                pinyin = extract_transcription(item)
                pairs.append((zh, vi, pinyin))

                if len(pairs) >= target_count:
                    return pairs

            time.sleep(0.15)

    return pairs


def merge_data(
    target_words: int,
    target_phrases: int,
    seed_limit: int,
    max_pages_per_seed: int,
    focus_categories: Optional[List[str]],
    min_category_count: int,
    focus_multiplier: int,
    cleanup_english_like_vi: bool,
) -> None:
    words = load_words()
    phrases_payload = load_phrases()
    phrases_raw = list(phrases_payload.get("phrases") or [])

    phrases, baseline_clean = clean_phrase_rows(
        phrases_raw,
        remove_english_like_vi=cleanup_english_like_vi,
    )

    print("=== Baseline Quality ===")
    print("words:", quality_report_words(words))
    print("phrases:", quality_report_phrases(phrases))
    if any(v > 0 for v in baseline_clean.values()):
        print("baseline_clean:", baseline_clean)
    print_category_snapshot("category_top_before", phrases)

    effective_focus = normalize_category_names(focus_categories or [])
    if min_category_count > 0:
        counts = category_counter(phrases)
        under_floor = [
            cat
            for cat in KNOWN_CATEGORY_ORDER
            if cat != "daily" and counts.get(cat, 0) < min_category_count
        ]
        effective_focus = unique_keep_order(effective_focus + under_floor)

    if effective_focus:
        print("focus_categories:", effective_focus)
    else:
        print("focus_categories: []")

    existing_word_set = {str(w.get("word", "")).strip() for w in words}
    existing_phrase_keys = {
        phrase_key(str(p.get("zh", "")), str(p.get("vi", ""))): True for p in phrases
    }

    session = requests.Session()
    session.headers.update({"User-Agent": "EL-ChineseDataFetcher/1.0"})

    max_wid = max_word_id(words)
    accepted_words: List[dict] = []
    if target_words > 0:
        print("\nFetching CEDICT...")
        cedict_raw = fetch_cedict_raw(session)
        word_candidates = collect_word_candidates(cedict_raw, existing_word_set, target_words)
        print(f"Collected {len(word_candidates)} word candidates before quality-gate translation")

        for simp, pinyin in word_candidates:
            vi = translate_zh_to_vi(session, simp)
            if not vi:
                continue
            if ASCII_ONLY_RE.fullmatch(vi) and len(vi) <= 2:
                continue

            max_wid += 1
            accepted_words.append(
                {
                    "id": f"zw_{max_wid:05d}",
                    "word": simp,
                    "wordTraditional": simp,
                    "pinyin": pinyin,
                    "meaning": vi,
                    "meaningEn": "",
                    "hskLevel": 6,
                    "level": "HSK6",
                    "type": "word",
                }
            )
            if len(accepted_words) >= target_words:
                break

        print(f"Accepted {len(accepted_words)} new words after quality gates")
    else:
        print("\nSkip CEDICT word fetch (--target-words=0)")

    print("\nFetching Tatoeba cmn->vie sentence pairs...")
    fetch_target = max(0, target_phrases)
    if effective_focus and fetch_target > 0:
        # Over-sample when focusing so we can keep more rows from low-count categories.
        fetch_target = max(fetch_target * 4, fetch_target + 400)

    seeds = build_query_seeds(
        seed_limit=seed_limit,
        focus_categories=effective_focus,
        focus_multiplier=focus_multiplier,
    )
    print(f"Using {len(seeds)} thematic seeds with up to {max_pages_per_seed} pages/seed")
    phrase_candidates = fetch_tatoeba_pairs(
        session,
        fetch_target,
        set(existing_phrase_keys.keys()),
        seeds,
        max_pages_per_seed=max_pages_per_seed,
    )
    print(f"Accepted {len(phrase_candidates)} phrase/sentence pairs after quality gates")

    max_pid = max_phrase_id(phrases)
    accepted_phrases: List[dict] = []
    focused_rows: List[Tuple[str, str, str, str, int, str]] = []
    other_rows: List[Tuple[str, str, str, str, int, str]] = []
    focus_set = set(effective_focus)

    for zh, vi, pinyin in phrase_candidates:
        cat = classify_phrase_category(zh, vi, "daily")
        hsk_num, hsk_level = infer_level_from_length(zh)
        row = (zh, vi, pinyin, cat, hsk_num, hsk_level)
        if focus_set and cat in focus_set:
            focused_rows.append(row)
        else:
            other_rows.append(row)

    combined_rows = focused_rows + other_rows
    if target_phrases > 0:
        combined_rows = combined_rows[:target_phrases]

    for zh, vi, pinyin, cat, hsk_num, hsk_level in combined_rows:
        max_pid += 1
        accepted_phrases.append(
            {
                "id": f"cp_{max_pid:06d}",
                "zh": zh,
                "vi": vi,
                "en": "",
                "pinyin": pinyin,
                "level": hsk_level,
                "hskLevel": hsk_num,
                "category": cat,
                "directions": ["zh-to-vi", "vi-to-zh"],
            }
        )

    if focus_set:
        print(f"Focused candidates kept: {len(focused_rows)} / {len(phrase_candidates)}")

    if not accepted_words and not accepted_phrases:
        raise FetchError("No high-quality new items were accepted; nothing to merge.")

    words_out = words + accepted_words
    phrases_out_raw = phrases + accepted_phrases
    phrases_out, post_merge_clean = clean_phrase_rows(
        phrases_out_raw,
        remove_english_like_vi=cleanup_english_like_vi,
    )
    if any(v > 0 for v in post_merge_clean.values()):
        print("post_merge_clean:", post_merge_clean)

    if target_words > 0:
        rebalance_words_hsk_levels(words_out)
    rebalance_phrases_levels_and_categories(phrases_out)

    # Final sanity check before writing.
    w_rep = quality_report_words(words_out)
    p_rep = quality_report_phrases(phrases_out)

    print("\n=== Post-Merge Quality ===")
    print("words:", w_rep)
    print("phrases:", p_rep)
    print_category_snapshot("category_top_after", phrases_out)

    if target_words > 0 and (w_rep["missing_word"] or w_rep["missing_meaning"] or w_rep["missing_pinyin"]):
        raise FetchError("Post-merge word quality check failed.")
    if p_rep["missing_zh"] or p_rep["missing_vi"]:
        raise FetchError("Post-merge phrase quality check failed.")

    if target_words > 0:
        WORDS_FILE.write_text(json.dumps(words_out, ensure_ascii=False, indent=2), encoding="utf-8")

    meta = phrases_payload.get("meta") or {}
    meta["source"] = "Merged: legacy + Tatoeba API (cmn-vie)"
    meta["totalPhrases"] = len(phrases_out)
    meta["generated"] = now_iso()

    phrases_payload["meta"] = meta
    phrases_payload["phrases"] = phrases_out

    PHRASES_FILE.write_text(json.dumps(phrases_payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print("\nDone.")
    print(f"Added words: {len(accepted_words)}")
    print(f"Added phrases: {len(accepted_phrases)}")


def rebalance_existing_data(cleanup_english_like_vi: bool) -> None:
    words = load_words()
    phrases_payload = load_phrases()
    phrases_raw = list(phrases_payload.get("phrases") or [])
    phrases, clean_stats = clean_phrase_rows(
        phrases_raw,
        remove_english_like_vi=cleanup_english_like_vi,
    )

    print("=== Before Rebalance ===")
    print("words:", quality_report_words(words))
    print("phrases:", quality_report_phrases(phrases))
    if any(v > 0 for v in clean_stats.values()):
        print("rebalance_clean:", clean_stats)
    print_category_snapshot("category_top_before", phrases)

    apply_rebalance(words, phrases)

    WORDS_FILE.write_text(json.dumps(words, ensure_ascii=False, indent=2), encoding="utf-8")

    meta = phrases_payload.get("meta") or {}
    meta["totalPhrases"] = len(phrases)
    meta["generated"] = now_iso()
    meta["rebalanced"] = True
    meta["rebalanceNote"] = "HSK levels and categories normalized by pipeline"
    phrases_payload["meta"] = meta
    phrases_payload["phrases"] = phrases
    PHRASES_FILE.write_text(json.dumps(phrases_payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print("\n=== After Rebalance ===")
    print("words:", quality_report_words(words))
    print("phrases:", quality_report_phrases(phrases))
    print_category_snapshot("category_top_after", phrases)
    print("Rebalance complete.")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--target-words", type=int, default=600)
    ap.add_argument("--target-phrases", type=int, default=1200)
    ap.add_argument("--seed-limit", type=int, default=600)
    ap.add_argument("--max-pages-per-seed", type=int, default=6)
    ap.add_argument("--focus-categories", type=str, default="")
    ap.add_argument("--min-category-count", type=int, default=0)
    ap.add_argument("--focus-multiplier", type=int, default=4)
    ap.add_argument("--cleanup-english-like-vi", action="store_true")
    ap.add_argument("--phrases-only", action="store_true")
    ap.add_argument("--rebalance-only", action="store_true")
    args = ap.parse_args()

    if args.rebalance_only:
        rebalance_existing_data(cleanup_english_like_vi=args.cleanup_english_like_vi)
        return

    target_words = 0 if args.phrases_only else max(0, args.target_words)
    focus_categories = parse_csv_categories(args.focus_categories)
    merge_data(
        target_words=target_words,
        target_phrases=max(0, args.target_phrases),
        seed_limit=max(1, args.seed_limit),
        max_pages_per_seed=max(1, args.max_pages_per_seed),
        focus_categories=focus_categories,
        min_category_count=max(0, args.min_category_count),
        focus_multiplier=max(1, args.focus_multiplier),
        cleanup_english_like_vi=bool(args.cleanup_english_like_vi),
    )


if __name__ == "__main__":
    main()
