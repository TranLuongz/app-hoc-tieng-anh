#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate comprehensive Chinese phrases dataset for HSK1-6 across all categories.
Merges with existing chinese_phrases.json.
"""
import json
import os
from datetime import datetime, timezone

# New phrases: (zh, pinyin, vi, en, level, category)
# Organized by category for clarity

NEW_PHRASES = [
    # ==================== GREETINGS ====================
    # HSK1
    ("早上好！", "zǎo shàng hǎo", "Chào buổi sáng!", "Good morning!", "HSK1", "greetings"),
    ("晚上好！", "wǎn shàng hǎo", "Chào buổi tối!", "Good evening!", "HSK1", "greetings"),
    ("你好吗？", "nǐ hǎo ma", "Bạn khỏe không?", "How are you?", "HSK1", "greetings"),
    ("我很好。", "wǒ hěn hǎo", "Tôi rất khỏe.", "I'm fine.", "HSK1", "greetings"),
    ("谢谢你。", "xiè xie nǐ", "Cảm ơn bạn.", "Thank you.", "HSK1", "greetings"),
    ("不客气。", "bú kè qi", "Không có gì.", "You're welcome.", "HSK1", "greetings"),
    ("对不起。", "duì bu qǐ", "Xin lỗi.", "I'm sorry.", "HSK1", "greetings"),
    ("没关系。", "méi guān xi", "Không sao.", "It's okay.", "HSK1", "greetings"),
    ("再见！", "zài jiàn", "Tạm biệt!", "Goodbye!", "HSK1", "greetings"),
    ("请问。", "qǐng wèn", "Xin hỏi.", "Excuse me.", "HSK1", "greetings"),
    ("你叫什么名字？", "nǐ jiào shén me míng zi", "Bạn tên gì?", "What's your name?", "HSK1", "greetings"),
    ("我叫小明。", "wǒ jiào xiǎo míng", "Tôi tên Tiểu Minh.", "My name is Xiao Ming.", "HSK1", "greetings"),
    ("认识你很高兴。", "rèn shi nǐ hěn gāo xìng", "Rất vui được biết bạn.", "Nice to meet you.", "HSK1", "greetings"),
    ("晚安。", "wǎn ān", "Chúc ngủ ngon.", "Good night.", "HSK1", "greetings"),
    ("欢迎你！", "huān yíng nǐ", "Chào mừng bạn!", "Welcome!", "HSK1", "greetings"),
    # HSK2
    ("好久不见！", "hǎo jiǔ bú jiàn", "Lâu rồi không gặp!", "Long time no see!", "HSK2", "greetings"),
    ("最近怎么样？", "zuì jìn zěn me yàng", "Dạo này thế nào?", "How have you been lately?", "HSK2", "greetings"),
    ("你身体好吗？", "nǐ shēn tǐ hǎo ma", "Sức khỏe bạn tốt không?", "How is your health?", "HSK2", "greetings"),
    ("祝你生日快乐！", "zhù nǐ shēng rì kuài lè", "Chúc mừng sinh nhật!", "Happy birthday!", "HSK2", "greetings"),
    ("新年快乐！", "xīn nián kuài lè", "Chúc mừng năm mới!", "Happy New Year!", "HSK2", "greetings"),
    ("请进。", "qǐng jìn", "Mời vào.", "Please come in.", "HSK2", "greetings"),
    ("请坐。", "qǐng zuò", "Mời ngồi.", "Please sit down.", "HSK2", "greetings"),
    ("你先请。", "nǐ xiān qǐng", "Bạn trước đi.", "After you.", "HSK2", "greetings"),
    ("辛苦了。", "xīn kǔ le", "Vất vả rồi.", "You've worked hard.", "HSK2", "greetings"),
    ("慢走。", "màn zǒu", "Đi cẩn thận.", "Take care on your way.", "HSK2", "greetings"),
    ("请多关照。", "qǐng duō guān zhào", "Xin hãy giúp đỡ nhiều.", "Please take good care of me.", "HSK2", "greetings"),
    ("路上小心。", "lù shàng xiǎo xīn", "Đi đường cẩn thận.", "Be careful on the road.", "HSK2", "greetings"),
    ("你吃了吗？", "nǐ chī le ma", "Bạn ăn rồi chưa?", "Have you eaten?", "HSK2", "greetings"),
    ("明天见。", "míng tiān jiàn", "Mai gặp lại.", "See you tomorrow.", "HSK2", "greetings"),
    ("周末愉快！", "zhōu mò yú kuài", "Cuối tuần vui vẻ!", "Have a nice weekend!", "HSK2", "greetings"),
    # HSK3
    ("很高兴再次见到你。", "hěn gāo xìng zài cì jiàn dào nǐ", "Rất vui được gặp lại bạn.", "Nice to see you again.", "HSK3", "greetings"),
    ("这是我的名片。", "zhè shì wǒ de míng piàn", "Đây là danh thiếp của tôi.", "This is my business card.", "HSK3", "greetings"),
    ("请问您贵姓？", "qǐng wèn nín guì xìng", "Xin hỏi quý danh ạ?", "May I ask your surname?", "HSK3", "greetings"),
    ("打扰一下。", "dǎ rǎo yí xià", "Xin làm phiền một chút.", "Excuse me for a moment.", "HSK3", "greetings"),
    ("不好意思，让你久等了。", "bù hǎo yì si, ràng nǐ jiǔ děng le", "Xin lỗi, để bạn chờ lâu rồi.", "Sorry to keep you waiting.", "HSK3", "greetings"),
    ("祝你一路平安。", "zhù nǐ yí lù píng ān", "Chúc bạn thượng lộ bình an.", "Wish you a safe journey.", "HSK3", "greetings"),
    ("恭喜恭喜！", "gōng xǐ gōng xǐ", "Chúc mừng chúc mừng!", "Congratulations!", "HSK3", "greetings"),
    ("祝你好运。", "zhù nǐ hǎo yùn", "Chúc bạn may mắn.", "Good luck to you.", "HSK3", "greetings"),
    ("节日快乐！", "jié rì kuài lè", "Ngày lễ vui vẻ!", "Happy holidays!", "HSK3", "greetings"),
    ("请代我向他问好。", "qǐng dài wǒ xiàng tā wèn hǎo", "Xin thay tôi gửi lời hỏi thăm.", "Please say hello to him for me.", "HSK3", "greetings"),
    # HSK4
    ("久仰大名。", "jiǔ yǎng dà míng", "Ngưỡng mộ đã lâu.", "I've long admired your reputation.", "HSK4", "greetings"),
    ("失陪一下。", "shī péi yí xià", "Xin phép rời đi một chút.", "Excuse me for a moment.", "HSK4", "greetings"),
    ("承蒙关照，非常感谢。", "chéng méng guān zhào, fēi cháng gǎn xiè", "Được quan tâm, vô cùng cảm ơn.", "Thank you very much for your care.", "HSK4", "greetings"),
    ("很荣幸认识您。", "hěn róng xìng rèn shi nín", "Rất vinh hạnh được biết ngài.", "It's an honor to meet you.", "HSK4", "greetings"),
    ("请多多指教。", "qǐng duō duō zhǐ jiào", "Xin hãy chỉ giáo nhiều.", "Please give me your guidance.", "HSK4", "greetings"),
    ("恕我直言。", "shù wǒ zhí yán", "Xin cho tôi nói thẳng.", "Allow me to speak frankly.", "HSK4", "greetings"),
    ("初次见面，请多关照。", "chū cì jiàn miàn, qǐng duō guān zhào", "Lần đầu gặp mặt, xin giúp đỡ nhiều.", "First time meeting, please take care of me.", "HSK4", "greetings"),
    ("感谢您的热情款待。", "gǎn xiè nín de rè qíng kuǎn dài", "Cảm ơn sự tiếp đãi nhiệt tình của ngài.", "Thank you for your warm hospitality.", "HSK4", "greetings"),
    ("后会有期。", "hòu huì yǒu qī", "Hẹn ngày tái ngộ.", "Until we meet again.", "HSK4", "greetings"),
    ("保重身体。", "bǎo zhòng shēn tǐ", "Giữ gìn sức khỏe.", "Take care of yourself.", "HSK4", "greetings"),
    # HSK5
    ("承蒙厚爱，不胜感激。", "chéng méng hòu ài, bù shèng gǎn jī", "Được yêu thương, vô cùng biết ơn.", "I'm deeply grateful for your kindness.", "HSK5", "greetings"),
    ("幸会幸会。", "xìng huì xìng huì", "May mắn được gặp.", "Pleased to meet you.", "HSK5", "greetings"),
    ("敬请期待。", "jìng qǐng qī dài", "Kính mời chờ đợi.", "Please look forward to it.", "HSK5", "greetings"),
    ("不胜荣幸。", "bù shèng róng xìng", "Vô cùng vinh hạnh.", "I'm extremely honored.", "HSK5", "greetings"),
    ("此次拜访，受益匪浅。", "cǐ cì bài fǎng, shòu yì fěi qiǎn", "Chuyến thăm này, thu được rất nhiều.", "This visit has been very beneficial.", "HSK5", "greetings"),
    ("希望今后多多合作。", "xī wàng jīn hòu duō duō hé zuò", "Hy vọng sau này hợp tác nhiều hơn.", "I hope we can cooperate more in the future.", "HSK5", "greetings"),
    ("别来无恙？", "bié lái wú yàng", "Lâu không gặp, vẫn khỏe chứ?", "Have you been well since we last met?", "HSK5", "greetings"),
    # HSK6
    ("阔别重逢，不胜欣喜。", "kuò bié chóng féng, bù shèng xīn xǐ", "Xa cách lâu gặp lại, vui mừng khôn xiết.", "After a long separation, I'm overjoyed to meet again.", "HSK6", "greetings"),
    ("承蒙不弃，甚感荣幸。", "chéng méng bú qì, shèn gǎn róng xìng", "Được không chê bỏ, thật vô cùng vinh hạnh.", "I'm honored that you haven't abandoned me.", "HSK6", "greetings"),
    ("请恕冒昧打扰。", "qǐng shù mào mèi dǎ rǎo", "Xin thứ lỗi đã mạo muội làm phiền.", "Please forgive my presumptuous disturbance.", "HSK6", "greetings"),
    ("后会有期，珍重再见。", "hòu huì yǒu qī, zhēn zhòng zài jiàn", "Hẹn ngày gặp lại, bảo trọng nhé.", "Until we meet again, take care.", "HSK6", "greetings"),
    ("此番告辞，望多保重。", "cǐ fān gào cí, wàng duō bǎo zhòng", "Lần này xin cáo từ, mong giữ gìn sức khỏe.", "I take my leave now, please take care.", "HSK6", "greetings"),

    # ==================== FAMILY ====================
    # HSK1
    ("这是我妈妈。", "zhè shì wǒ mā ma", "Đây là mẹ tôi.", "This is my mother.", "HSK1", "family"),
    ("我有一个哥哥。", "wǒ yǒu yí gè gē ge", "Tôi có một anh trai.", "I have an older brother.", "HSK1", "family"),
    ("爸爸在家。", "bà ba zài jiā", "Bố ở nhà.", "Dad is at home.", "HSK1", "family"),
    ("她是我姐姐。", "tā shì wǒ jiě jie", "Cô ấy là chị tôi.", "She is my older sister.", "HSK1", "family"),
    ("我爱我的家人。", "wǒ ài wǒ de jiā rén", "Tôi yêu gia đình mình.", "I love my family.", "HSK1", "family"),
    ("弟弟很小。", "dì di hěn xiǎo", "Em trai còn nhỏ.", "My younger brother is small.", "HSK1", "family"),
    ("妹妹在学校。", "mèi mei zài xué xiào", "Em gái ở trường.", "My younger sister is at school.", "HSK1", "family"),
    ("我家有五口人。", "wǒ jiā yǒu wǔ kǒu rén", "Nhà tôi có năm người.", "There are five people in my family.", "HSK1", "family"),
    # HSK2
    ("我姐姐比我大三岁。", "wǒ jiě jie bǐ wǒ dà sān suì", "Chị tôi lớn hơn tôi ba tuổi.", "My older sister is three years older than me.", "HSK2", "family"),
    ("爷爷今年八十岁了。", "yé ye jīn nián bā shí suì le", "Ông năm nay tám mươi tuổi rồi.", "Grandpa is eighty years old this year.", "HSK2", "family"),
    ("奶奶做的菜很好吃。", "nǎi nai zuò de cài hěn hǎo chī", "Món bà nội nấu rất ngon.", "Grandma's cooking is very delicious.", "HSK2", "family"),
    ("妈妈每天都很忙。", "mā ma měi tiān dōu hěn máng", "Mẹ ngày nào cũng bận.", "Mom is busy every day.", "HSK2", "family"),
    ("我弟弟喜欢踢足球。", "wǒ dì di xǐ huan tī zú qiú", "Em trai tôi thích đá bóng.", "My younger brother likes playing football.", "HSK2", "family"),
    ("爸爸在公司工作。", "bà ba zài gōng sī gōng zuò", "Bố làm việc ở công ty.", "Dad works at a company.", "HSK2", "family"),
    ("我们全家一起吃饭。", "wǒ men quán jiā yì qǐ chī fàn", "Cả nhà chúng tôi cùng ăn cơm.", "Our whole family eats together.", "HSK2", "family"),
    ("姐姐在大学学习。", "jiě jie zài dà xué xué xí", "Chị đang học ở đại học.", "My older sister studies at university.", "HSK2", "family"),
    # HSK3
    ("我们家周末经常去公园。", "wǒ men jiā zhōu mò jīng cháng qù gōng yuán", "Gia đình tôi cuối tuần thường đi công viên.", "Our family often goes to the park on weekends.", "HSK3", "family"),
    ("外公外婆住在乡下。", "wài gōng wài pó zhù zài xiāng xià", "Ông bà ngoại sống ở quê.", "My maternal grandparents live in the countryside.", "HSK3", "family"),
    ("叔叔是一名医生。", "shū shu shì yì míng yī shēng", "Chú là một bác sĩ.", "My uncle is a doctor.", "HSK3", "family"),
    ("阿姨刚生了一个宝宝。", "ā yí gāng shēng le yí gè bǎo bao", "Dì vừa sinh một em bé.", "My aunt just had a baby.", "HSK3", "family"),
    ("表哥下个月结婚。", "biǎo gē xià gè yuè jié hūn", "Anh họ tháng sau kết hôn.", "My cousin is getting married next month.", "HSK3", "family"),
    ("爸爸教我骑自行车。", "bà ba jiāo wǒ qí zì xíng chē", "Bố dạy tôi đi xe đạp.", "Dad taught me to ride a bicycle.", "HSK3", "family"),
    ("妈妈经常给我打电话。", "mā ma jīng cháng gěi wǒ dǎ diàn huà", "Mẹ thường xuyên gọi điện cho tôi.", "Mom often calls me.", "HSK3", "family"),
    ("我和弟弟长得很像。", "wǒ hé dì di zhǎng de hěn xiàng", "Tôi và em trai giống nhau lắm.", "My younger brother and I look very similar.", "HSK3", "family"),
    # HSK4
    ("父母为了孩子付出了很多。", "fù mǔ wèi le hái zi fù chū le hěn duō", "Cha mẹ đã hy sinh rất nhiều vì con cái.", "Parents have sacrificed a lot for their children.", "HSK4", "family"),
    ("我们一家人过春节回老家。", "wǒ men yì jiā rén guò chūn jié huí lǎo jiā", "Cả gia đình chúng tôi về quê ăn Tết.", "Our whole family goes back to our hometown for Chinese New Year.", "HSK4", "family"),
    ("姐姐的婚礼办得很隆重。", "jiě jie de hūn lǐ bàn de hěn lóng zhòng", "Đám cưới chị tổ chức rất long trọng.", "My sister's wedding was held grandly.", "HSK4", "family"),
    ("孩子们都长大了，不再需要我照顾了。", "hái zi men dōu zhǎng dà le, bú zài xū yào wǒ zhào gù le", "Bọn trẻ đều lớn rồi, không cần tôi chăm sóc nữa.", "The children have all grown up, they no longer need my care.", "HSK4", "family"),
    ("我外婆会讲很多有趣的故事。", "wǒ wài pó huì jiǎng hěn duō yǒu qù de gù shi", "Bà ngoại tôi biết kể nhiều câu chuyện thú vị.", "My grandmother can tell many interesting stories.", "HSK4", "family"),
    ("哥哥去年当了爸爸。", "gē ge qù nián dāng le bà ba", "Anh trai năm ngoái lên chức bố.", "My older brother became a father last year.", "HSK4", "family"),
    ("我们家有一个传统，每年中秋节全家团聚。", "wǒ men jiā yǒu yí gè chuán tǒng, měi nián zhōng qiū jié quán jiā tuán jù", "Gia đình tôi có truyền thống, mỗi năm Trung Thu cả nhà đoàn tụ.", "Our family has a tradition of reuniting every Mid-Autumn Festival.", "HSK4", "family"),
    # HSK5
    ("父母含辛茹苦地把我们养大。", "fù mǔ hán xīn rú kǔ de bǎ wǒ men yǎng dà", "Cha mẹ chịu bao đắng cay nuôi chúng tôi lớn.", "Our parents raised us with great hardship.", "HSK5", "family"),
    ("家庭教育对孩子的成长至关重要。", "jiā tíng jiào yù duì hái zi de chéng zhǎng zhì guān zhòng yào", "Giáo dục gia đình rất quan trọng đối với sự trưởng thành của trẻ.", "Family education is crucial to a child's growth.", "HSK5", "family"),
    ("随着年龄增长，我越来越理解父母的苦心。", "suí zhe nián líng zēng zhǎng, wǒ yuè lái yuè lǐ jiě fù mǔ de kǔ xīn", "Theo tuổi tác tăng lên, tôi ngày càng hiểu tấm lòng cha mẹ.", "As I grow older, I increasingly understand my parents' good intentions.", "HSK5", "family"),
    ("兄弟姐妹之间应该互相帮助。", "xiōng dì jiě mèi zhī jiān yīng gāi hù xiāng bāng zhù", "Anh chị em nên giúp đỡ lẫn nhau.", "Siblings should help each other.", "HSK5", "family"),
    ("她为了照顾老人，辞去了工作。", "tā wèi le zhào gù lǎo rén, cí qù le gōng zuò", "Cô ấy vì chăm sóc người già mà nghỉ việc.", "She quit her job to take care of the elderly.", "HSK5", "family"),
    # HSK6
    ("代际沟通是许多家庭面临的挑战。", "dài jì gōu tōng shì xǔ duō jiā tíng miàn lín de tiǎo zhàn", "Giao tiếp giữa các thế hệ là thách thức nhiều gia đình phải đối mặt.", "Intergenerational communication is a challenge many families face.", "HSK6", "family"),
    ("传统的家族观念在现代社会中逐渐淡化。", "chuán tǒng de jiā zú guān niàn zài xiàn dài shè huì zhōng zhú jiàn dàn huà", "Quan niệm gia tộc truyền thống dần nhạt phai trong xã hội hiện đại.", "Traditional clan concepts are gradually fading in modern society.", "HSK6", "family"),
    ("赡养父母既是法律义务，也是道德责任。", "shàn yǎng fù mǔ jì shì fǎ lǜ yì wù, yě shì dào dé zé rèn", "Phụng dưỡng cha mẹ vừa là nghĩa vụ pháp luật, vừa là trách nhiệm đạo đức.", "Supporting parents is both a legal obligation and a moral responsibility.", "HSK6", "family"),
    ("血浓于水，家人之间的纽带是最牢固的。", "xuè nóng yú shuǐ, jiā rén zhī jiān de niǔ dài shì zuì láo gù de", "Huyết thống đậm hơn nước, sợi dây giữa người thân là vững chắc nhất.", "Blood is thicker than water; the bond between family members is the strongest.", "HSK6", "family"),

    # ==================== FOOD ====================
    # HSK1
    ("我想吃米饭。", "wǒ xiǎng chī mǐ fàn", "Tôi muốn ăn cơm.", "I want to eat rice.", "HSK1", "food"),
    ("你喜欢吃什么？", "nǐ xǐ huan chī shén me", "Bạn thích ăn gì?", "What do you like to eat?", "HSK1", "food"),
    ("我想喝水。", "wǒ xiǎng hē shuǐ", "Tôi muốn uống nước.", "I want to drink water.", "HSK1", "food"),
    ("这个菜很好吃。", "zhè ge cài hěn hǎo chī", "Món này rất ngon.", "This dish is very delicious.", "HSK1", "food"),
    ("我不吃肉。", "wǒ bù chī ròu", "Tôi không ăn thịt.", "I don't eat meat.", "HSK1", "food"),
    ("请给我一杯茶。", "qǐng gěi wǒ yì bēi chá", "Cho tôi một tách trà.", "Please give me a cup of tea.", "HSK1", "food"),
    ("苹果多少钱？", "píng guǒ duō shǎo qián", "Táo bao nhiêu tiền?", "How much are the apples?", "HSK1", "food"),
    ("我早上吃面包。", "wǒ zǎo shang chī miàn bāo", "Tôi sáng ăn bánh mì.", "I eat bread in the morning.", "HSK1", "food"),
    ("他在做饭。", "tā zài zuò fàn", "Anh ấy đang nấu cơm.", "He is cooking.", "HSK1", "food"),
    ("我们去吃饭吧。", "wǒ men qù chī fàn ba", "Chúng ta đi ăn cơm đi.", "Let's go eat.", "HSK1", "food"),
    # HSK2
    ("这家饭馆的鱼做得特别好。", "zhè jiā fàn guǎn de yú zuò de tè bié hǎo", "Nhà hàng này nấu cá đặc biệt ngon.", "This restaurant makes fish especially well.", "HSK2", "food"),
    ("我每天都喝牛奶。", "wǒ měi tiān dōu hē niú nǎi", "Tôi ngày nào cũng uống sữa.", "I drink milk every day.", "HSK2", "food"),
    ("你想吃鸡蛋还是面条？", "nǐ xiǎng chī jī dàn hái shì miàn tiáo", "Bạn muốn ăn trứng hay mì?", "Do you want to eat eggs or noodles?", "HSK2", "food"),
    ("西瓜又大又甜。", "xī guā yòu dà yòu tián", "Dưa hấu vừa to vừa ngọt.", "The watermelon is big and sweet.", "HSK2", "food"),
    ("我中午吃了一碗面。", "wǒ zhōng wǔ chī le yì wǎn miàn", "Buổi trưa tôi ăn một bát mì.", "I had a bowl of noodles for lunch.", "HSK2", "food"),
    ("妈妈做了很多菜。", "mā ma zuò le hěn duō cài", "Mẹ nấu nhiều món lắm.", "Mom made a lot of dishes.", "HSK2", "food"),
    ("我不喜欢吃辣的。", "wǒ bù xǐ huan chī là de", "Tôi không thích ăn cay.", "I don't like spicy food.", "HSK2", "food"),
    ("服务员，买单。", "fú wù yuán, mǎi dān", "Phục vụ ơi, tính tiền.", "Waiter, check please.", "HSK2", "food"),
    # HSK3
    ("中国菜有很多种口味。", "zhōng guó cài yǒu hěn duō zhǒng kǒu wèi", "Món Trung Quốc có rất nhiều loại hương vị.", "Chinese food has many flavors.", "HSK3", "food"),
    ("我要一份宫保鸡丁。", "wǒ yào yí fèn gōng bǎo jī dīng", "Tôi muốn một phần gà Cung Bảo.", "I'd like a serving of Kung Pao Chicken.", "HSK3", "food"),
    ("这道菜放了太多盐。", "zhè dào cài fàng le tài duō yán", "Món này cho quá nhiều muối.", "This dish has too much salt.", "HSK3", "food"),
    ("北京烤鸭非常有名。", "běi jīng kǎo yā fēi cháng yǒu míng", "Vịt quay Bắc Kinh rất nổi tiếng.", "Peking Duck is very famous.", "HSK3", "food"),
    ("你会做什么菜？", "nǐ huì zuò shén me cài", "Bạn biết nấu món gì?", "What dishes can you cook?", "HSK3", "food"),
    ("我想预订一张桌子。", "wǒ xiǎng yù dìng yì zhāng zhuō zi", "Tôi muốn đặt một bàn.", "I'd like to reserve a table.", "HSK3", "food"),
    ("这道汤很鲜。", "zhè dào tāng hěn xiān", "Món canh này rất ngọt nước.", "This soup is very savory.", "HSK3", "food"),
    ("火锅是四川最有名的菜。", "huǒ guō shì sì chuān zuì yǒu míng de cài", "Lẩu là món nổi tiếng nhất Tứ Xuyên.", "Hot pot is the most famous dish of Sichuan.", "HSK3", "food"),
    # HSK4
    ("这家餐厅的菜单很丰富，选择很多。", "zhè jiā cān tīng de cài dān hěn fēng fù, xuǎn zé hěn duō", "Thực đơn nhà hàng này rất phong phú, nhiều lựa chọn.", "This restaurant's menu is very rich with many choices.", "HSK4", "food"),
    ("素食越来越受到年轻人的欢迎。", "sù shí yuè lái yuè shòu dào nián qīng rén de huān yíng", "Ăn chay ngày càng được giới trẻ yêu thích.", "Vegetarian food is becoming increasingly popular among young people.", "HSK4", "food"),
    ("饮食习惯对健康有很大的影响。", "yǐn shí xí guàn duì jiàn kāng yǒu hěn dà de yǐng xiǎng", "Thói quen ăn uống ảnh hưởng rất lớn đến sức khỏe.", "Eating habits have a great impact on health.", "HSK4", "food"),
    ("中国的八大菜系各有特色。", "zhōng guó de bā dà cài xì gè yǒu tè sè", "Tám hệ phái ẩm thực Trung Quốc mỗi nơi một đặc sắc.", "China's eight major cuisines each have their own characteristics.", "HSK4", "food"),
    ("我对海鲜过敏。", "wǒ duì hǎi xiān guò mǐn", "Tôi bị dị ứng hải sản.", "I'm allergic to seafood.", "HSK4", "food"),
    ("这家外卖的评分很高。", "zhè jiā wài mài de píng fēn hěn gāo", "Đánh giá quán giao hàng này rất cao.", "This takeout place has very high ratings.", "HSK4", "food"),
    # HSK5
    ("民以食为天，中国人对饮食文化十分重视。", "mín yǐ shí wéi tiān, zhōng guó rén duì yǐn shí wén huà shí fēn zhòng shì", "Dân lấy ăn làm trời, người Trung Quốc rất coi trọng văn hóa ẩm thực.", "Food is paramount to the people; Chinese highly value food culture.", "HSK5", "food"),
    ("有机食品虽然贵，但更健康。", "yǒu jī shí pǐn suī rán guì, dàn gèng jiàn kāng", "Thực phẩm hữu cơ tuy đắt nhưng tốt cho sức khỏe hơn.", "Organic food is expensive but healthier.", "HSK5", "food"),
    ("食品安全问题引起了社会的广泛关注。", "shí pǐn ān quán wèn tí yǐn qǐ le shè huì de guǎng fàn guān zhù", "Vấn đề an toàn thực phẩm gây ra sự quan tâm rộng rãi của xã hội.", "Food safety issues have attracted widespread social attention.", "HSK5", "food"),
    ("合理搭配膳食，才能保持身体健康。", "hé lǐ dā pèi shàn shí, cái néng bǎo chí shēn tǐ jiàn kāng", "Phối hợp bữa ăn hợp lý mới giữ được sức khỏe.", "Only by properly balancing meals can you maintain good health.", "HSK5", "food"),
    # HSK6
    ("中华美食博大精深，源远流长。", "zhōng huá měi shí bó dà jīng shēn, yuán yuǎn liú cháng", "Ẩm thực Trung Hoa sâu rộng tinh thâm, nguồn gốc lâu đời.", "Chinese cuisine is profound and has a long history.", "HSK6", "food"),
    ("烹饪技艺讲究色香味俱全。", "pēng rèn jì yì jiǎng jiū sè xiāng wèi jù quán", "Nghệ thuật nấu ăn chú trọng sắc hương vị đầy đủ.", "Cooking art emphasizes the completeness of color, aroma, and taste.", "HSK6", "food"),
    ("转基因食品的安全性仍存在争议。", "zhuǎn jī yīn shí pǐn de ān quán xìng réng cún zài zhēng yì", "Tính an toàn của thực phẩm biến đổi gen vẫn còn tranh cãi.", "The safety of genetically modified food remains controversial.", "HSK6", "food"),

    # ==================== TRAVEL ====================
    # HSK1
    ("我想去中国。", "wǒ xiǎng qù zhōng guó", "Tôi muốn đi Trung Quốc.", "I want to go to China.", "HSK1", "travel"),
    ("飞机票多少钱？", "fēi jī piào duō shǎo qián", "Vé máy bay bao nhiêu tiền?", "How much is the plane ticket?", "HSK1", "travel"),
    ("火车站在哪儿？", "huǒ chē zhàn zài nǎr", "Ga tàu ở đâu?", "Where is the train station?", "HSK1", "travel"),
    ("我住在这个酒店。", "wǒ zhù zài zhè ge jiǔ diàn", "Tôi ở khách sạn này.", "I'm staying at this hotel.", "HSK1", "travel"),
    ("请问，去机场怎么走？", "qǐng wèn, qù jī chǎng zěn me zǒu", "Xin hỏi, đi sân bay đi đường nào?", "Excuse me, how do I get to the airport?", "HSK1", "travel"),
    ("我要一张去北京的票。", "wǒ yào yì zhāng qù běi jīng de piào", "Tôi muốn một vé đi Bắc Kinh.", "I want a ticket to Beijing.", "HSK1", "travel"),
    ("我的护照在这里。", "wǒ de hù zhào zài zhè lǐ", "Hộ chiếu của tôi ở đây.", "My passport is here.", "HSK1", "travel"),
    ("这里离那里远吗？", "zhè lǐ lí nà lǐ yuǎn ma", "Từ đây đến đó có xa không?", "Is it far from here to there?", "HSK1", "travel"),
    # HSK2
    ("我们坐出租车去吧。", "wǒ men zuò chū zū chē qù ba", "Chúng ta đi taxi đi.", "Let's take a taxi.", "HSK2", "travel"),
    ("你去过上海吗？", "nǐ qù guo shàng hǎi ma", "Bạn đã đến Thượng Hải chưa?", "Have you been to Shanghai?", "HSK2", "travel"),
    ("我打算坐高铁去。", "wǒ dǎ suàn zuò gāo tiě qù", "Tôi dự định đi tàu cao tốc.", "I plan to take the high-speed train.", "HSK2", "travel"),
    ("旅游的时候拍了很多照片。", "lǚ yóu de shí hou pāi le hěn duō zhào piàn", "Khi đi du lịch chụp được nhiều ảnh lắm.", "I took many photos while traveling.", "HSK2", "travel"),
    ("这个地方很漂亮。", "zhè ge dì fang hěn piào liang", "Nơi này rất đẹp.", "This place is very beautiful.", "HSK2", "travel"),
    ("我想订一间房间。", "wǒ xiǎng dìng yì jiān fáng jiān", "Tôi muốn đặt một phòng.", "I want to book a room.", "HSK2", "travel"),
    ("地图在哪里买？", "dì tú zài nǎ lǐ mǎi", "Mua bản đồ ở đâu?", "Where can I buy a map?", "HSK2", "travel"),
    ("飞机几点起飞？", "fēi jī jǐ diǎn qǐ fēi", "Máy bay mấy giờ cất cánh?", "What time does the plane take off?", "HSK2", "travel"),
    # HSK3
    ("我想申请签证。", "wǒ xiǎng shēn qǐng qiān zhèng", "Tôi muốn xin visa.", "I want to apply for a visa.", "HSK3", "travel"),
    ("这个景点值得一去。", "zhè ge jǐng diǎn zhí de yí qù", "Địa điểm du lịch này đáng đi.", "This scenic spot is worth visiting.", "HSK3", "travel"),
    ("导游说这座山有两千年历史。", "dǎo yóu shuō zhè zuò shān yǒu liǎng qiān nián lì shǐ", "Hướng dẫn viên nói ngọn núi này có hai nghìn năm lịch sử.", "The tour guide says this mountain has two thousand years of history.", "HSK3", "travel"),
    ("行李太多了，我需要一辆行李车。", "xíng li tài duō le, wǒ xū yào yí liàng xíng li chē", "Hành lý quá nhiều, tôi cần một xe đẩy hành lý.", "I have too much luggage, I need a luggage cart.", "HSK3", "travel"),
    ("请问有免费的Wi-Fi吗？", "qǐng wèn yǒu miǎn fèi de wài fài ma", "Xin hỏi có Wi-Fi miễn phí không?", "Excuse me, is there free Wi-Fi?", "HSK3", "travel"),
    ("这是我第一次出国旅行。", "zhè shì wǒ dì yī cì chū guó lǚ xíng", "Đây là lần đầu tiên tôi đi nước ngoài.", "This is my first time traveling abroad.", "HSK3", "travel"),
    ("我迷路了，能帮我吗？", "wǒ mí lù le, néng bāng wǒ ma", "Tôi bị lạc đường rồi, giúp tôi được không?", "I'm lost, can you help me?", "HSK3", "travel"),
    ("请问这里有换钱的地方吗？", "qǐng wèn zhè lǐ yǒu huàn qián de dì fang ma", "Xin hỏi ở đây có chỗ đổi tiền không?", "Is there a currency exchange place here?", "HSK3", "travel"),
    # HSK4
    ("这次旅行的行程安排得很紧凑。", "zhè cì lǚ xíng de xíng chéng ān pái de hěn jǐn còu", "Lịch trình chuyến đi này sắp xếp rất chặt chẽ.", "The itinerary for this trip is very tightly arranged.", "HSK4", "travel"),
    ("建议你提前预订酒店，旺季房间很紧张。", "jiàn yì nǐ tí qián yù dìng jiǔ diàn, wàng jì fáng jiān hěn jǐn zhāng", "Khuyên bạn đặt khách sạn trước, mùa cao điểm phòng rất khan hiếm.", "I suggest you book a hotel in advance; rooms are scarce in peak season.", "HSK4", "travel"),
    ("坐国际航班要提前三个小时到机场。", "zuò guó jì háng bān yào tí qián sān gè xiǎo shí dào jī chǎng", "Đi chuyến bay quốc tế phải đến sân bay trước ba tiếng.", "You need to arrive at the airport three hours early for international flights.", "HSK4", "travel"),
    ("我在网上查了很多旅游攻略。", "wǒ zài wǎng shàng chá le hěn duō lǚ yóu gōng lüè", "Tôi đã tra nhiều hướng dẫn du lịch trên mạng.", "I looked up many travel guides online.", "HSK4", "travel"),
    ("长城是世界上最伟大的建筑之一。", "cháng chéng shì shì jiè shàng zuì wěi dà de jiàn zhù zhī yī", "Vạn Lý Trường Thành là một trong những công trình vĩ đại nhất thế giới.", "The Great Wall is one of the greatest structures in the world.", "HSK4", "travel"),
    # HSK5
    ("自助旅行可以让你更深入地了解当地文化。", "zì zhù lǚ xíng kě yǐ ràng nǐ gèng shēn rù de liǎo jiě dāng dì wén huà", "Du lịch tự túc giúp bạn hiểu sâu hơn văn hóa địa phương.", "Independent travel allows you to understand local culture more deeply.", "HSK5", "travel"),
    ("旅游业是许多发展中国家的支柱产业。", "lǚ yóu yè shì xǔ duō fā zhǎn zhōng guó jiā de zhī zhù chǎn yè", "Ngành du lịch là ngành trụ cột của nhiều nước đang phát triển.", "Tourism is a pillar industry for many developing countries.", "HSK5", "travel"),
    ("过度旅游开发对生态环境造成了破坏。", "guò dù lǚ yóu kāi fā duì shēng tài huán jìng zào chéng le pò huài", "Khai thác du lịch quá mức gây phá hoại môi trường sinh thái.", "Excessive tourism development has caused ecological damage.", "HSK5", "travel"),
    ("背包客的旅行方式越来越流行。", "bēi bāo kè de lǚ xíng fāng shì yuè lái yuè liú xíng", "Phong cách du lịch bụi ngày càng phổ biến.", "Backpacking travel is becoming more and more popular.", "HSK5", "travel"),
    # HSK6
    ("旅途中的见闻丰富了我的人生阅历。", "lǚ tú zhōng de jiàn wén fēng fù le wǒ de rén shēng yuè lì", "Những gì thấy nghe trong chuyến đi làm phong phú trải nghiệm đời tôi.", "The experiences during the journey enriched my life experience.", "HSK6", "travel"),
    ("可持续旅游成为全球旅游业的发展趋势。", "kě chí xù lǚ yóu chéng wéi quán qiú lǚ yóu yè de fā zhǎn qū shì", "Du lịch bền vững trở thành xu hướng phát triển của ngành du lịch toàn cầu.", "Sustainable tourism has become a global tourism development trend.", "HSK6", "travel"),
    ("世界遗产的保护与旅游开发之间需要寻找平衡。", "shì jiè yí chǎn de bǎo hù yǔ lǚ yóu kāi fā zhī jiān xū yào xún zhǎo píng héng", "Giữa bảo tồn di sản thế giới và khai thác du lịch cần tìm sự cân bằng.", "A balance needs to be found between world heritage protection and tourism development.", "HSK6", "travel"),

    # ==================== SHOPPING ====================
    # HSK1
    ("这个多少钱？", "zhè ge duō shǎo qián", "Cái này bao nhiêu tiền?", "How much is this?", "HSK1", "shopping"),
    ("太贵了！", "tài guì le", "Đắt quá!", "Too expensive!", "HSK1", "shopping"),
    ("便宜一点吧。", "pián yi yì diǎn ba", "Rẻ hơn một chút đi.", "Make it a bit cheaper.", "HSK1", "shopping"),
    ("我要买这个。", "wǒ yào mǎi zhè ge", "Tôi muốn mua cái này.", "I want to buy this.", "HSK1", "shopping"),
    ("可以试试吗？", "kě yǐ shì shi ma", "Có thể thử được không?", "Can I try it?", "HSK1", "shopping"),
    ("有没有大一点的？", "yǒu méi yǒu dà yì diǎn de", "Có cái lớn hơn không?", "Do you have a bigger one?", "HSK1", "shopping"),
    ("我要两个。", "wǒ yào liǎng gè", "Tôi muốn hai cái.", "I want two.", "HSK1", "shopping"),
    ("可以用现金吗？", "kě yǐ yòng xiàn jīn ma", "Có thể dùng tiền mặt không?", "Can I pay with cash?", "HSK1", "shopping"),
    # HSK2
    ("这件衣服很好看。", "zhè jiàn yī fu hěn hǎo kàn", "Bộ quần áo này rất đẹp.", "This piece of clothing looks great.", "HSK2", "shopping"),
    ("你穿多大号的？", "nǐ chuān duō dà hào de", "Bạn mặc cỡ nào?", "What size do you wear?", "HSK2", "shopping"),
    ("这条裤子太长了。", "zhè tiáo kù zi tài cháng le", "Cái quần này dài quá.", "These pants are too long.", "HSK2", "shopping"),
    ("我想看看那双鞋。", "wǒ xiǎng kàn kan nà shuāng xié", "Tôi muốn xem đôi giày đó.", "I'd like to look at those shoes.", "HSK2", "shopping"),
    ("打折吗？", "dǎ zhé ma", "Có giảm giá không?", "Is there a discount?", "HSK2", "shopping"),
    ("收银台在哪里？", "shōu yín tái zài nǎ lǐ", "Quầy thu ngân ở đâu?", "Where is the cashier?", "HSK2", "shopping"),
    ("可以刷卡吗？", "kě yǐ shuā kǎ ma", "Có thể quẹt thẻ không?", "Can I pay by card?", "HSK2", "shopping"),
    ("这个颜色不太好看。", "zhè ge yán sè bú tài hǎo kàn", "Màu này không đẹp lắm.", "This color doesn't look very good.", "HSK2", "shopping"),
    # HSK3
    ("这家商场正在搞促销活动。", "zhè jiā shāng chǎng zhèng zài gǎo cù xiāo huó dòng", "Trung tâm thương mại này đang khuyến mãi.", "This mall is having a promotion.", "HSK3", "shopping"),
    ("网上购物比在商店买便宜。", "wǎng shàng gòu wù bǐ zài shāng diàn mǎi pián yi", "Mua hàng trực tuyến rẻ hơn mua ở cửa hàng.", "Online shopping is cheaper than buying in stores.", "HSK3", "shopping"),
    ("这件商品可以退换吗？", "zhè jiàn shāng pǐn kě yǐ tuì huàn ma", "Sản phẩm này có thể đổi trả không?", "Can this product be returned or exchanged?", "HSK3", "shopping"),
    ("我在淘宝上买的。", "wǒ zài táo bǎo shàng mǎi de", "Tôi mua trên Taobao.", "I bought it on Taobao.", "HSK3", "shopping"),
    ("这双鞋穿着很舒服。", "zhè shuāng xié chuān zhe hěn shū fu", "Đôi giày này mang rất thoải mái.", "These shoes are very comfortable to wear.", "HSK3", "shopping"),
    ("今天超市的水果打八折。", "jīn tiān chāo shì de shuǐ guǒ dǎ bā zhé", "Hôm nay trái cây siêu thị giảm 20%.", "Fruit at the supermarket is 20% off today.", "HSK3", "shopping"),
    # HSK4
    ("消费者应该理性消费，不要冲动购物。", "xiāo fèi zhě yīng gāi lǐ xìng xiāo fèi, bú yào chōng dòng gòu wù", "Người tiêu dùng nên chi tiêu lý trí, đừng mua sắm bốc đồng.", "Consumers should spend rationally and avoid impulse buying.", "HSK4", "shopping"),
    ("双十一是中国最大的网购节日。", "shuāng shí yī shì zhōng guó zuì dà de wǎng gòu jié rì", "Ngày 11/11 là lễ hội mua sắm online lớn nhất Trung Quốc.", "Double Eleven is China's biggest online shopping festival.", "HSK4", "shopping"),
    ("这家品牌的质量一直很好。", "zhè jiā pǐn pái de zhì liàng yì zhí hěn hǎo", "Chất lượng thương hiệu này luôn rất tốt.", "This brand's quality has always been very good.", "HSK4", "shopping"),
    ("买东西之前最好先比较一下价格。", "mǎi dōng xi zhī qián zuì hǎo xiān bǐ jiào yí xià jià gé", "Trước khi mua đồ tốt nhất nên so sánh giá trước.", "It's best to compare prices before buying.", "HSK4", "shopping"),
    ("我已经在网上下单了，等快递送来。", "wǒ yǐ jīng zài wǎng shàng xià dān le, děng kuài dì sòng lái", "Tôi đã đặt hàng online rồi, chờ giao hàng.", "I've already ordered online, waiting for delivery.", "HSK4", "shopping"),
    # HSK5
    ("随着电子商务的发展，传统零售业面临巨大挑战。", "suí zhe diàn zǐ shāng wù de fā zhǎn, chuán tǒng líng shòu yè miàn lín jù dà tiǎo zhàn", "Với sự phát triển thương mại điện tử, bán lẻ truyền thống đối mặt thách thức lớn.", "With the development of e-commerce, traditional retail faces huge challenges.", "HSK5", "shopping"),
    ("消费升级让人们更注重品质而非价格。", "xiāo fèi shēng jí ràng rén men gèng zhù zhòng pǐn zhì ér fēi jià gé", "Nâng cấp tiêu dùng khiến người ta chú trọng chất lượng hơn giá cả.", "Consumption upgrade makes people focus more on quality than price.", "HSK5", "shopping"),
    ("直播带货成为了一种新的购物方式。", "zhí bō dài huò chéng wéi le yì zhǒng xīn de gòu wù fāng shì", "Livestream bán hàng trở thành phương thức mua sắm mới.", "Livestream selling has become a new way of shopping.", "HSK5", "shopping"),
    # HSK6
    ("消费主义盛行导致资源浪费和环境问题。", "xiāo fèi zhǔ yì shèng xíng dǎo zhì zī yuán làng fèi hé huán jìng wèn tí", "Chủ nghĩa tiêu dùng thịnh hành dẫn đến lãng phí tài nguyên và vấn đề môi trường.", "The prevalence of consumerism leads to resource waste and environmental problems.", "HSK6", "shopping"),
    ("跨境电商打破了国际贸易的壁垒。", "kuà jìng diàn shāng dǎ pò le guó jì mào yì de bì lěi", "Thương mại điện tử xuyên biên giới phá vỡ rào cản thương mại quốc tế.", "Cross-border e-commerce has broken down international trade barriers.", "HSK6", "shopping"),

    # ==================== WORK ====================
    # HSK1
    ("你在哪里工作？", "nǐ zài nǎ lǐ gōng zuò", "Bạn làm việc ở đâu?", "Where do you work?", "HSK1", "work"),
    ("我是老师。", "wǒ shì lǎo shī", "Tôi là giáo viên.", "I am a teacher.", "HSK1", "work"),
    ("他是医生。", "tā shì yī shēng", "Anh ấy là bác sĩ.", "He is a doctor.", "HSK1", "work"),
    ("我每天八点上班。", "wǒ měi tiān bā diǎn shàng bān", "Tôi mỗi ngày tám giờ đi làm.", "I go to work at eight every day.", "HSK1", "work"),
    ("她在医院工作。", "tā zài yī yuàn gōng zuò", "Cô ấy làm việc ở bệnh viện.", "She works at a hospital.", "HSK1", "work"),
    ("你做什么工作？", "nǐ zuò shén me gōng zuò", "Bạn làm nghề gì?", "What do you do for a living?", "HSK1", "work"),
    ("今天不上班。", "jīn tiān bú shàng bān", "Hôm nay không đi làm.", "No work today.", "HSK1", "work"),
    ("我下午五点下班。", "wǒ xià wǔ wǔ diǎn xià bān", "Tôi chiều năm giờ tan làm.", "I get off work at five in the afternoon.", "HSK1", "work"),
    # HSK2
    ("我在一家公司当经理。", "wǒ zài yì jiā gōng sī dāng jīng lǐ", "Tôi làm quản lý ở một công ty.", "I'm a manager at a company.", "HSK2", "work"),
    ("今天工作很忙。", "jīn tiān gōng zuò hěn máng", "Hôm nay công việc rất bận.", "Today's work is very busy.", "HSK2", "work"),
    ("老板让我加班。", "lǎo bǎn ràng wǒ jiā bān", "Sếp bảo tôi làm thêm giờ.", "The boss asked me to work overtime.", "HSK2", "work"),
    ("我找到新工作了。", "wǒ zhǎo dào xīn gōng zuò le", "Tôi tìm được việc mới rồi.", "I found a new job.", "HSK2", "work"),
    ("这份工作的工资不高。", "zhè fèn gōng zuò de gōng zī bù gāo", "Lương công việc này không cao.", "The salary for this job is not high.", "HSK2", "work"),
    ("我想换一份工作。", "wǒ xiǎng huàn yí fèn gōng zuò", "Tôi muốn đổi việc.", "I want to change jobs.", "HSK2", "work"),
    ("他是一名工程师。", "tā shì yì míng gōng chéng shī", "Anh ấy là một kỹ sư.", "He is an engineer.", "HSK2", "work"),
    ("办公室在三楼。", "bàn gōng shì zài sān lóu", "Văn phòng ở tầng ba.", "The office is on the third floor.", "HSK2", "work"),
    # HSK3
    ("我们公司下周要招聘新员工。", "wǒ men gōng sī xià zhōu yào zhāo pìn xīn yuán gōng", "Công ty chúng tôi tuần sau tuyển nhân viên mới.", "Our company is hiring new employees next week.", "HSK3", "work"),
    ("面试的时候不要太紧张。", "miàn shì de shí hou bú yào tài jǐn zhāng", "Khi phỏng vấn đừng quá căng thẳng.", "Don't be too nervous during the interview.", "HSK3", "work"),
    ("我的同事都很友好。", "wǒ de tóng shì dōu hěn yǒu hǎo", "Đồng nghiệp của tôi đều rất thân thiện.", "My colleagues are all very friendly.", "HSK3", "work"),
    ("这个项目需要一个月完成。", "zhè ge xiàng mù xū yào yí gè yuè wán chéng", "Dự án này cần một tháng để hoàn thành.", "This project needs a month to complete.", "HSK3", "work"),
    ("请把报告发给我。", "qǐng bǎ bào gào fā gěi wǒ", "Xin gửi báo cáo cho tôi.", "Please send me the report.", "HSK3", "work"),
    ("下午两点有一个会议。", "xià wǔ liǎng diǎn yǒu yí gè huì yì", "Hai giờ chiều có một cuộc họp.", "There's a meeting at two in the afternoon.", "HSK3", "work"),
    ("他被提升为部门经理了。", "tā bèi tí shēng wéi bù mén jīng lǐ le", "Anh ấy được thăng chức trưởng phòng.", "He was promoted to department manager.", "HSK3", "work"),
    ("我正在准备明天的演讲。", "wǒ zhèng zài zhǔn bèi míng tiān de yǎn jiǎng", "Tôi đang chuẩn bị bài thuyết trình ngày mai.", "I'm preparing tomorrow's speech.", "HSK3", "work"),
    # HSK4
    ("职场竞争越来越激烈。", "zhí chǎng jìng zhēng yuè lái yuè jī liè", "Cạnh tranh nơi công sở ngày càng khốc liệt.", "Workplace competition is becoming increasingly fierce.", "HSK4", "work"),
    ("团队合作比个人能力更重要。", "tuán duì hé zuò bǐ gè rén néng lì gèng zhòng yào", "Hợp tác nhóm quan trọng hơn năng lực cá nhân.", "Teamwork is more important than individual ability.", "HSK4", "work"),
    ("他因为表现出色获得了年终奖。", "tā yīn wèi biǎo xiàn chū sè huò dé le nián zhōng jiǎng", "Anh ấy vì thành tích xuất sắc mà được thưởng cuối năm.", "He received a year-end bonus for outstanding performance.", "HSK4", "work"),
    ("这次出差让我学到了很多经验。", "zhè cì chū chāi ràng wǒ xué dào le hěn duō jīng yàn", "Chuyến công tác này cho tôi học được nhiều kinh nghiệm.", "This business trip taught me a lot of experience.", "HSK4", "work"),
    ("加班已经成为很多人的生活常态。", "jiā bān yǐ jīng chéng wéi hěn duō rén de shēng huó cháng tài", "Làm thêm giờ đã trở thành bình thường trong cuộc sống nhiều người.", "Working overtime has become a norm for many people.", "HSK4", "work"),
    ("公司计划在明年扩大规模。", "gōng sī jì huà zài míng nián kuò dà guī mó", "Công ty lên kế hoạch mở rộng quy mô năm sau.", "The company plans to expand next year.", "HSK4", "work"),
    # HSK5
    ("远程办公模式改变了传统的工作方式。", "yuǎn chéng bàn gōng mó shì gǎi biàn le chuán tǒng de gōng zuò fāng shì", "Mô hình làm việc từ xa thay đổi phương thức làm việc truyền thống.", "Remote work has changed traditional work patterns.", "HSK5", "work"),
    ("员工福利是吸引人才的重要因素。", "yuán gōng fú lì shì xī yǐn rén cái de zhòng yào yīn sù", "Phúc lợi nhân viên là yếu tố quan trọng thu hút nhân tài.", "Employee benefits are an important factor in attracting talent.", "HSK5", "work"),
    ("企业文化对员工的工作积极性有很大影响。", "qǐ yè wén huà duì yuán gōng de gōng zuò jī jí xìng yǒu hěn dà yǐng xiǎng", "Văn hóa doanh nghiệp ảnh hưởng lớn đến tính tích cực của nhân viên.", "Corporate culture greatly affects employee motivation.", "HSK5", "work"),
    ("他辞职创业，开了自己的公司。", "tā cí zhí chuàng yè, kāi le zì jǐ de gōng sī", "Anh ấy nghỉ việc khởi nghiệp, mở công ty riêng.", "He resigned to start his own business.", "HSK5", "work"),
    # HSK6
    ("职业倦怠已成为现代职场中普遍存在的现象。", "zhí yè juàn dài yǐ chéng wéi xiàn dài zhí chǎng zhōng pǔ biàn cún zài de xiàn xiàng", "Kiệt sức nghề nghiệp đã trở thành hiện tượng phổ biến nơi công sở hiện đại.", "Professional burnout has become a common phenomenon in modern workplaces.", "HSK6", "work"),
    ("灵活就业和零工经济正在重塑劳动力市场。", "líng huó jiù yè hé líng gōng jīng jì zhèng zài chóng sù láo dòng lì shì chǎng", "Việc làm linh hoạt và kinh tế gig đang tái định hình thị trường lao động.", "Flexible employment and the gig economy are reshaping the labor market.", "HSK6", "work"),
    ("跨国企业需要具备跨文化沟通能力的人才。", "kuà guó qǐ yè xū yào jù bèi kuà wén huà gōu tōng néng lì de rén cái", "Doanh nghiệp đa quốc gia cần nhân tài có năng lực giao tiếp liên văn hóa.", "Multinational enterprises need talents with cross-cultural communication skills.", "HSK6", "work"),

    # ==================== STUDY ====================
    # HSK1
    ("我在学中文。", "wǒ zài xué zhōng wén", "Tôi đang học tiếng Trung.", "I'm studying Chinese.", "HSK1", "study"),
    ("这个字怎么读？", "zhè ge zì zěn me dú", "Chữ này đọc thế nào?", "How do you read this character?", "HSK1", "study"),
    ("请再说一次。", "qǐng zài shuō yí cì", "Xin nói lại một lần.", "Please say it again.", "HSK1", "study"),
    ("我不懂这个词。", "wǒ bù dǒng zhè ge cí", "Tôi không hiểu từ này.", "I don't understand this word.", "HSK1", "study"),
    ("老师，请写在黑板上。", "lǎo shī, qǐng xiě zài hēi bǎn shàng", "Thầy ơi, xin viết lên bảng.", "Teacher, please write it on the blackboard.", "HSK1", "study"),
    ("我每天学十个汉字。", "wǒ měi tiān xué shí gè hàn zì", "Tôi mỗi ngày học mười chữ Hán.", "I learn ten Chinese characters every day.", "HSK1", "study"),
    # HSK2
    ("中文的声调很难学。", "zhōng wén de shēng diào hěn nán xué", "Thanh điệu tiếng Trung rất khó học.", "Chinese tones are very hard to learn.", "HSK2", "study"),
    ("你的中文说得很好。", "nǐ de zhōng wén shuō de hěn hǎo", "Bạn nói tiếng Trung rất giỏi.", "Your Chinese is very good.", "HSK2", "study"),
    ("考试考了多少分？", "kǎo shì kǎo le duō shǎo fēn", "Thi được bao nhiêu điểm?", "What score did you get on the exam?", "HSK2", "study"),
    ("我要准备HSK考试。", "wǒ yào zhǔn bèi HSK kǎo shì", "Tôi phải chuẩn bị thi HSK.", "I need to prepare for the HSK exam.", "HSK2", "study"),
    ("这本教材写得很清楚。", "zhè běn jiào cái xiě de hěn qīng chu", "Giáo trình này viết rất rõ ràng.", "This textbook is written very clearly.", "HSK2", "study"),
    ("我每天都练习写汉字。", "wǒ měi tiān dōu liàn xí xiě hàn zì", "Tôi mỗi ngày đều luyện viết chữ Hán.", "I practice writing Chinese characters every day.", "HSK2", "study"),
    # HSK3
    ("学习语言需要长期坚持。", "xué xí yǔ yán xū yào cháng qī jiān chí", "Học ngôn ngữ cần kiên trì lâu dài.", "Learning a language requires long-term persistence.", "HSK3", "study"),
    ("我报名了一个中文培训班。", "wǒ bào míng le yí gè zhōng wén péi xùn bān", "Tôi đăng ký một lớp đào tạo tiếng Trung.", "I signed up for a Chinese training class.", "HSK3", "study"),
    ("他的毕业论文写得非常好。", "tā de bì yè lùn wén xiě de fēi cháng hǎo", "Luận văn tốt nghiệp của anh ấy viết rất hay.", "His graduation thesis was written very well.", "HSK3", "study"),
    ("图书馆里有很多中文书。", "tú shū guǎn lǐ yǒu hěn duō zhōng wén shū", "Thư viện có rất nhiều sách tiếng Trung.", "There are many Chinese books in the library.", "HSK3", "study"),
    ("留学生活既有趣又辛苦。", "liú xué shēng huó jì yǒu qù yòu xīn kǔ", "Cuộc sống du học vừa thú vị vừa vất vả.", "Studying abroad is both fun and tough.", "HSK3", "study"),
    ("我在网上找到了很多学习资料。", "wǒ zài wǎng shàng zhǎo dào le hěn duō xué xí zī liào", "Tôi tìm được nhiều tài liệu học tập trên mạng.", "I found a lot of study materials online.", "HSK3", "study"),
    # HSK4
    ("掌握一门外语对未来发展很有帮助。", "zhǎng wò yì mén wài yǔ duì wèi lái fā zhǎn hěn yǒu bāng zhù", "Nắm vững một ngoại ngữ rất có ích cho phát triển tương lai.", "Mastering a foreign language is very helpful for future development.", "HSK4", "study"),
    ("在线教育的发展让学习更加方便。", "zài xiàn jiào yù de fā zhǎn ràng xué xí gèng jiā fāng biàn", "Sự phát triển giáo dục trực tuyến giúp học tập thuận tiện hơn.", "The development of online education makes learning more convenient.", "HSK4", "study"),
    ("通过看中文电影可以提高听力水平。", "tōng guò kàn zhōng wén diàn yǐng kě yǐ tí gāo tīng lì shuǐ píng", "Xem phim Trung Quốc có thể nâng cao trình độ nghe.", "Watching Chinese movies can improve your listening level.", "HSK4", "study"),
    ("老师建议我多和中国人交流。", "lǎo shī jiàn yì wǒ duō hé zhōng guó rén jiāo liú", "Thầy khuyên tôi nên giao lưu nhiều với người Trung Quốc.", "The teacher suggests I communicate more with Chinese people.", "HSK4", "study"),
    # HSK5
    ("沉浸式语言学习被证明是最有效的方法之一。", "chén jìn shì yǔ yán xué xí bèi zhèng míng shì zuì yǒu xiào de fāng fǎ zhī yī", "Phương pháp học ngôn ngữ nhập vai được chứng minh là hiệu quả nhất.", "Immersive language learning has been proven to be one of the most effective methods.", "HSK5", "study"),
    ("终身学习是适应快速变化社会的必要条件。", "zhōng shēn xué xí shì shì yìng kuài sù biàn huà shè huì de bì yào tiáo jiàn", "Học tập suốt đời là điều kiện cần để thích ứng xã hội thay đổi nhanh.", "Lifelong learning is necessary for adapting to a rapidly changing society.", "HSK5", "study"),
    ("批判性思维能力是高等教育的核心目标。", "pī pàn xìng sī wéi néng lì shì gāo děng jiào yù de hé xīn mù biāo", "Năng lực tư duy phản biện là mục tiêu cốt lõi của giáo dục đại học.", "Critical thinking ability is a core goal of higher education.", "HSK5", "study"),
    # HSK6
    ("教育公平是社会公正的基石。", "jiào yù gōng píng shì shè huì gōng zhèng de jī shí", "Công bằng giáo dục là nền tảng của công bằng xã hội.", "Educational equity is the foundation of social justice.", "HSK6", "study"),
    ("素质教育强调全面发展而非应试成绩。", "sù zhì jiào yù qiáng diào quán miàn fā zhǎn ér fēi yìng shì chéng jì", "Giáo dục tố chất nhấn mạnh phát triển toàn diện thay vì điểm thi.", "Quality education emphasizes comprehensive development rather than test scores.", "HSK6", "study"),

    # ==================== HEALTH ====================
    # HSK1
    ("我不舒服。", "wǒ bù shū fu", "Tôi không khỏe.", "I don't feel well.", "HSK1", "health"),
    ("我头疼。", "wǒ tóu téng", "Tôi đau đầu.", "I have a headache.", "HSK1", "health"),
    ("我想去看医生。", "wǒ xiǎng qù kàn yī shēng", "Tôi muốn đi khám bác sĩ.", "I want to see a doctor.", "HSK1", "health"),
    ("你怎么了？", "nǐ zěn me le", "Bạn sao vậy?", "What's wrong with you?", "HSK1", "health"),
    ("我感冒了。", "wǒ gǎn mào le", "Tôi bị cảm.", "I have a cold.", "HSK1", "health"),
    ("多喝水。", "duō hē shuǐ", "Uống nhiều nước.", "Drink more water.", "HSK1", "health"),
    ("早点休息。", "zǎo diǎn xiū xi", "Nghỉ ngơi sớm.", "Rest early.", "HSK1", "health"),
    ("医院在哪里？", "yī yuàn zài nǎ lǐ", "Bệnh viện ở đâu?", "Where is the hospital?", "HSK1", "health"),
    # HSK2
    ("你应该多运动。", "nǐ yīng gāi duō yùn dòng", "Bạn nên tập thể dục nhiều hơn.", "You should exercise more.", "HSK2", "health"),
    ("我肚子疼。", "wǒ dù zi téng", "Tôi đau bụng.", "I have a stomachache.", "HSK2", "health"),
    ("吃药了吗？", "chī yào le ma", "Uống thuốc chưa?", "Have you taken your medicine?", "HSK2", "health"),
    ("我发烧了。", "wǒ fā shāo le", "Tôi bị sốt.", "I have a fever.", "HSK2", "health"),
    ("我眼睛不舒服。", "wǒ yǎn jing bù shū fu", "Mắt tôi không thoải mái.", "My eyes are uncomfortable.", "HSK2", "health"),
    ("这里有药店吗？", "zhè lǐ yǒu yào diàn ma", "Ở đây có hiệu thuốc không?", "Is there a pharmacy here?", "HSK2", "health"),
    ("你的身体好多了吗？", "nǐ de shēn tǐ hǎo duō le ma", "Sức khỏe bạn đỡ chưa?", "Are you feeling better?", "HSK2", "health"),
    ("每天睡八个小时最好。", "měi tiān shuì bā gè xiǎo shí zuì hǎo", "Mỗi ngày ngủ tám tiếng là tốt nhất.", "It's best to sleep eight hours a day.", "HSK2", "health"),
    # HSK3
    ("我对花粉过敏。", "wǒ duì huā fěn guò mǐn", "Tôi bị dị ứng phấn hoa.", "I'm allergic to pollen.", "HSK3", "health"),
    ("医生说要多休息。", "yī shēng shuō yào duō xiū xi", "Bác sĩ nói phải nghỉ ngơi nhiều.", "The doctor says I need more rest.", "HSK3", "health"),
    ("每天跑步对身体很好。", "měi tiān pǎo bù duì shēn tǐ hěn hǎo", "Chạy bộ mỗi ngày rất tốt cho sức khỏe.", "Running every day is very good for your health.", "HSK3", "health"),
    ("我需要做一个检查。", "wǒ xū yào zuò yí gè jiǎn chá", "Tôi cần làm một lần kiểm tra.", "I need to have an examination.", "HSK3", "health"),
    ("他因为压力大失眠了。", "tā yīn wèi yā lì dà shī mián le", "Anh ấy vì áp lực lớn mà mất ngủ.", "He has insomnia due to stress.", "HSK3", "health"),
    ("少吃甜食对牙齿好。", "shǎo chī tián shí duì yá chǐ hǎo", "Ăn ít đồ ngọt tốt cho răng.", "Eating less sweets is good for your teeth.", "HSK3", "health"),
    ("请挂内科的号。", "qǐng guà nèi kē de hào", "Xin đăng ký khoa nội.", "Please register for the internal medicine department.", "HSK3", "health"),
    # HSK4
    ("保持良好的生活习惯可以预防很多疾病。", "bǎo chí liáng hǎo de shēng huó xí guàn kě yǐ yù fáng hěn duō jí bìng", "Duy trì thói quen sinh hoạt tốt có thể phòng ngừa nhiều bệnh.", "Maintaining good living habits can prevent many diseases.", "HSK4", "health"),
    ("心理健康和身体健康同样重要。", "xīn lǐ jiàn kāng hé shēn tǐ jiàn kāng tóng yàng zhòng yào", "Sức khỏe tinh thần và thể chất đều quan trọng như nhau.", "Mental health is just as important as physical health.", "HSK4", "health"),
    ("吸烟有害健康，应该尽早戒烟。", "xī yān yǒu hài jiàn kāng, yīng gāi jǐn zǎo jiè yān", "Hút thuốc có hại sức khỏe, nên cai thuốc sớm.", "Smoking is harmful to health; you should quit as soon as possible.", "HSK4", "health"),
    ("定期体检能够及时发现健康问题。", "dìng qī tǐ jiǎn néng gòu jí shí fā xiàn jiàn kāng wèn tí", "Khám sức khỏe định kỳ phát hiện vấn đề kịp thời.", "Regular check-ups can detect health problems in time.", "HSK4", "health"),
    ("均衡的饮食对健康非常重要。", "jūn héng de yǐn shí duì jiàn kāng fēi cháng zhòng yào", "Chế độ ăn cân bằng rất quan trọng cho sức khỏe.", "A balanced diet is very important for health.", "HSK4", "health"),
    # HSK5
    ("医疗资源分配不均是许多国家面临的问题。", "yī liáo zī yuán fēn pèi bù jūn shì xǔ duō guó jiā miàn lín de wèn tí", "Phân bổ nguồn lực y tế không đều là vấn đề nhiều nước phải đối mặt.", "Uneven distribution of medical resources is a problem many countries face.", "HSK5", "health"),
    ("中医强调治未病，注重预防。", "zhōng yī qiáng diào zhì wèi bìng, zhù zhòng yù fáng", "Y học cổ truyền nhấn mạnh trị chưa bệnh, chú trọng phòng ngừa.", "Traditional Chinese medicine emphasizes prevention over cure.", "HSK5", "health"),
    ("过度使用手机对视力和颈椎造成损害。", "guò dù shǐ yòng shǒu jī duì shì lì hé jǐng zhuī zào chéng sǔn hài", "Sử dụng điện thoại quá mức gây hại thị lực và cột sống cổ.", "Excessive phone use damages eyesight and cervical spine.", "HSK5", "health"),
    # HSK6
    ("基因编辑技术在医学领域展现了巨大潜力。", "jī yīn biān jí jì shù zài yī xué lǐng yù zhǎn xiàn le jù dà qián lì", "Công nghệ chỉnh sửa gen thể hiện tiềm năng lớn trong lĩnh vực y học.", "Gene editing technology shows great potential in the medical field.", "HSK6", "health"),
    ("老龄化社会对公共卫生体系提出了新的挑战。", "lǎo líng huà shè huì duì gōng gòng wèi shēng tǐ xì tí chū le xīn de tiǎo zhàn", "Xã hội già hóa đặt ra thách thức mới cho hệ thống y tế công cộng.", "An aging society poses new challenges to the public health system.", "HSK6", "health"),
    ("精准医疗根据个体差异制定治疗方案。", "jīng zhǔn yī liáo gēn jù gè tǐ chā yì zhì dìng zhì liáo fāng àn", "Y học chính xác lập phương án điều trị dựa trên sự khác biệt cá thể.", "Precision medicine develops treatment plans based on individual differences.", "HSK6", "health"),

    # ==================== WEATHER ====================
    # HSK1
    ("今天天气很好。", "jīn tiān tiān qì hěn hǎo", "Hôm nay thời tiết rất tốt.", "The weather is very nice today.", "HSK1", "weather"),
    ("今天很热。", "jīn tiān hěn rè", "Hôm nay rất nóng.", "It's very hot today.", "HSK1", "weather"),
    ("今天很冷。", "jīn tiān hěn lěng", "Hôm nay rất lạnh.", "It's very cold today.", "HSK1", "weather"),
    ("下雨了。", "xià yǔ le", "Mưa rồi.", "It's raining.", "HSK1", "weather"),
    ("明天会下雨吗？", "míng tiān huì xià yǔ ma", "Ngày mai có mưa không?", "Will it rain tomorrow?", "HSK1", "weather"),
    ("天气很好，我们出去吧。", "tiān qì hěn hǎo, wǒ men chū qù ba", "Thời tiết đẹp, chúng ta đi ra ngoài đi.", "The weather is nice, let's go out.", "HSK1", "weather"),
    ("你带伞了吗？", "nǐ dài sǎn le ma", "Bạn mang ô chưa?", "Did you bring an umbrella?", "HSK1", "weather"),
    # HSK2
    ("今天风很大。", "jīn tiān fēng hěn dà", "Hôm nay gió rất lớn.", "It's very windy today.", "HSK2", "weather"),
    ("外面下雪了。", "wài miàn xià xuě le", "Bên ngoài tuyết rơi rồi.", "It's snowing outside.", "HSK2", "weather"),
    ("春天来了，花都开了。", "chūn tiān lái le, huā dōu kāi le", "Mùa xuân đến, hoa đều nở rồi.", "Spring has come, all the flowers are blooming.", "HSK2", "weather"),
    ("夏天太热了，我不想出去。", "xià tiān tài rè le, wǒ bù xiǎng chū qù", "Mùa hè nóng quá, tôi không muốn ra ngoài.", "It's too hot in summer, I don't want to go out.", "HSK2", "weather"),
    ("秋天的天气最舒服。", "qiū tiān de tiān qì zuì shū fu", "Thời tiết mùa thu dễ chịu nhất.", "Autumn weather is the most comfortable.", "HSK2", "weather"),
    ("冬天要穿厚衣服。", "dōng tiān yào chuān hòu yī fu", "Mùa đông phải mặc quần áo dày.", "You need to wear thick clothes in winter.", "HSK2", "weather"),
    ("明天天气怎么样？", "míng tiān tiān qì zěn me yàng", "Ngày mai thời tiết thế nào?", "What will the weather be like tomorrow?", "HSK2", "weather"),
    ("今天多云。", "jīn tiān duō yún", "Hôm nay nhiều mây.", "It's cloudy today.", "HSK2", "weather"),
    # HSK3
    ("天气预报说明天有雷阵雨。", "tiān qì yù bào shuō míng tiān yǒu léi zhèn yǔ", "Dự báo thời tiết nói ngày mai có mưa dông.", "The weather forecast says there will be thunderstorms tomorrow.", "HSK3", "weather"),
    ("这里的气候四季分明。", "zhè lǐ de qì hòu sì jì fēn míng", "Khí hậu ở đây bốn mùa rõ rệt.", "The climate here has four distinct seasons.", "HSK3", "weather"),
    ("南方的冬天比北方暖和。", "nán fāng de dōng tiān bǐ běi fāng nuǎn huo", "Mùa đông phương nam ấm hơn phương bắc.", "Winters in the south are warmer than in the north.", "HSK3", "weather"),
    ("温度下降了，多穿点衣服。", "wēn dù xià jiàng le, duō chuān diǎn yī fu", "Nhiệt độ giảm rồi, mặc thêm áo đi.", "The temperature has dropped, wear more clothes.", "HSK3", "weather"),
    ("今天的空气质量不太好。", "jīn tiān de kōng qì zhì liàng bú tài hǎo", "Chất lượng không khí hôm nay không tốt lắm.", "The air quality today is not very good.", "HSK3", "weather"),
    ("台风要来了，大家注意安全。", "tái fēng yào lái le, dà jiā zhù yì ān quán", "Bão sắp đến, mọi người chú ý an toàn.", "A typhoon is coming, everyone be careful.", "HSK3", "weather"),
    # HSK4
    ("极端天气事件越来越频繁。", "jí duān tiān qì shì jiàn yuè lái yuè pín fán", "Các hiện tượng thời tiết cực đoan ngày càng thường xuyên.", "Extreme weather events are becoming more frequent.", "HSK4", "weather"),
    ("雾霾天气对人体健康有很大危害。", "wù mái tiān qì duì rén tǐ jiàn kāng yǒu hěn dà wēi hài", "Thời tiết sương mù ô nhiễm rất có hại cho sức khỏe.", "Smoggy weather is very harmful to human health.", "HSK4", "weather"),
    ("全球变暖导致冰川融化加速。", "quán qiú biàn nuǎn dǎo zhì bīng chuān róng huà jiā sù", "Nóng lên toàn cầu khiến sông băng tan nhanh hơn.", "Global warming is causing glaciers to melt faster.", "HSK4", "weather"),
    ("这个城市夏天经常发生洪水。", "zhè ge chéng shì xià tiān jīng cháng fā shēng hóng shuǐ", "Thành phố này mùa hè thường xảy ra lũ lụt.", "This city often experiences floods in summer.", "HSK4", "weather"),
    # HSK5
    ("厄尔尼诺现象对全球气候产生了深远影响。", "è ěr ní nuò xiàn xiàng duì quán qiú qì hòu chǎn shēng le shēn yuǎn yǐng xiǎng", "Hiện tượng El Nino tác động sâu rộng đến khí hậu toàn cầu.", "The El Nino phenomenon has had a profound impact on global climate.", "HSK5", "weather"),
    ("气象卫星技术的进步使天气预报更加准确。", "qì xiàng wèi xīng jì shù de jìn bù shǐ tiān qì yù bào gèng jiā zhǔn què", "Tiến bộ công nghệ vệ tinh khí tượng giúp dự báo thời tiết chính xác hơn.", "Advances in meteorological satellite technology have made weather forecasts more accurate.", "HSK5", "weather"),
    # HSK6
    ("碳中和目标的实现需要各国共同努力。", "tàn zhōng hé mù biāo de shí xiàn xū yào gè guó gòng tóng nǔ lì", "Đạt mục tiêu trung hòa carbon cần các nước cùng nỗ lực.", "Achieving carbon neutrality requires joint efforts from all countries.", "HSK6", "weather"),
    ("极地冰盖的消融正在加剧全球海平面上升。", "jí dì bīng gài de xiāo róng zhèng zài jiā jù quán qiú hǎi píng miàn shàng shēng", "Băng cực tan chảy đang làm trầm trọng thêm mực nước biển dâng toàn cầu.", "The melting of polar ice caps is accelerating global sea level rise.", "HSK6", "weather"),

    # ==================== HOUSING ====================
    # HSK1
    ("我住在这里。", "wǒ zhù zài zhè lǐ", "Tôi ở đây.", "I live here.", "HSK1", "housing"),
    ("我的房间很大。", "wǒ de fáng jiān hěn dà", "Phòng tôi rất rộng.", "My room is very big.", "HSK1", "housing"),
    ("你住在几楼？", "nǐ zhù zài jǐ lóu", "Bạn ở tầng mấy?", "What floor do you live on?", "HSK1", "housing"),
    ("我家有三个房间。", "wǒ jiā yǒu sān gè fáng jiān", "Nhà tôi có ba phòng.", "My home has three rooms.", "HSK1", "housing"),
    ("卫生间在哪里？", "wèi shēng jiān zài nǎ lǐ", "Nhà vệ sinh ở đâu?", "Where is the bathroom?", "HSK1", "housing"),
    ("你的家在哪里？", "nǐ de jiā zài nǎ lǐ", "Nhà bạn ở đâu?", "Where is your home?", "HSK1", "housing"),
    # HSK2
    ("我想租一套房子。", "wǒ xiǎng zū yí tào fáng zi", "Tôi muốn thuê một căn nhà.", "I want to rent a house.", "HSK2", "housing"),
    ("这个房子的房租多少钱？", "zhè ge fáng zi de fáng zū duō shǎo qián", "Tiền thuê nhà này bao nhiêu?", "How much is the rent for this house?", "HSK2", "housing"),
    ("厨房很干净。", "chú fáng hěn gān jìng", "Bếp rất sạch sẽ.", "The kitchen is very clean.", "HSK2", "housing"),
    ("客厅里有一个沙发。", "kè tīng lǐ yǒu yí gè shā fā", "Trong phòng khách có một cái sofa.", "There's a sofa in the living room.", "HSK2", "housing"),
    ("窗户旁边有一张桌子。", "chuāng hu páng biān yǒu yì zhāng zhuō zi", "Bên cửa sổ có một cái bàn.", "There's a table next to the window.", "HSK2", "housing"),
    ("楼下有一个超市。", "lóu xià yǒu yí gè chāo shì", "Dưới lầu có một siêu thị.", "There's a supermarket downstairs.", "HSK2", "housing"),
    ("空调坏了。", "kōng tiáo huài le", "Điều hòa hỏng rồi.", "The air conditioner is broken.", "HSK2", "housing"),
    ("这个小区很安静。", "zhè ge xiǎo qū hěn ān jìng", "Khu chung cư này rất yên tĩnh.", "This residential area is very quiet.", "HSK2", "housing"),
    # HSK3
    ("我打算搬到离公司更近的地方。", "wǒ dǎ suàn bān dào lí gōng sī gèng jìn de dì fang", "Tôi dự định chuyển đến gần công ty hơn.", "I plan to move closer to the company.", "HSK3", "housing"),
    ("这套公寓有两室一厅。", "zhè tào gōng yù yǒu liǎng shì yì tīng", "Căn hộ này có hai phòng ngủ một phòng khách.", "This apartment has two bedrooms and one living room.", "HSK3", "housing"),
    ("物业管理费每个月要交。", "wù yè guǎn lǐ fèi měi gè yuè yào jiāo", "Phí quản lý vật nghiệp phải đóng mỗi tháng.", "Property management fees must be paid monthly.", "HSK3", "housing"),
    ("我想买一些新家具。", "wǒ xiǎng mǎi yì xiē xīn jiā jù", "Tôi muốn mua một số đồ nội thất mới.", "I want to buy some new furniture.", "HSK3", "housing"),
    ("这里的交通很方便。", "zhè lǐ de jiāo tōng hěn fāng biàn", "Giao thông ở đây rất thuận tiện.", "The transportation here is very convenient.", "HSK3", "housing"),
    ("邻居们都很友好。", "lín jū men dōu hěn yǒu hǎo", "Hàng xóm đều rất thân thiện.", "The neighbors are all very friendly.", "HSK3", "housing"),
    ("我们要装修新房子。", "wǒ men yào zhuāng xiū xīn fáng zi", "Chúng tôi phải trang trí nhà mới.", "We need to renovate the new house.", "HSK3", "housing"),
    # HSK4
    ("房价越来越高，年轻人买房压力很大。", "fáng jià yuè lái yuè gāo, nián qīng rén mǎi fáng yā lì hěn dà", "Giá nhà ngày càng cao, giới trẻ áp lực mua nhà rất lớn.", "Housing prices are getting higher, putting great pressure on young people.", "HSK4", "housing"),
    ("很多人选择贷款买房。", "hěn duō rén xuǎn zé dài kuǎn mǎi fáng", "Nhiều người chọn vay mua nhà.", "Many people choose to take out loans to buy houses.", "HSK4", "housing"),
    ("智能家居让生活更加便利。", "zhì néng jiā jū ràng shēng huó gèng jiā biàn lì", "Nhà thông minh giúp cuộc sống tiện lợi hơn.", "Smart home technology makes life more convenient.", "HSK4", "housing"),
    ("合租可以减轻经济压力。", "hé zū kě yǐ jiǎn qīng jīng jì yā lì", "Thuê chung có thể giảm bớt áp lực kinh tế.", "Sharing rent can reduce financial pressure.", "HSK4", "housing"),
    ("这个小区的绿化做得很好。", "zhè ge xiǎo qū de lǜ huà zuò de hěn hǎo", "Khu dân cư này cây xanh trồng rất đẹp.", "This residential area's landscaping is very well done.", "HSK4", "housing"),
    # HSK5
    ("城市化进程推动了房地产市场的快速发展。", "chéng shì huà jìn chéng tuī dòng le fáng dì chǎn shì chǎng de kuài sù fā zhǎn", "Quá trình đô thị hóa thúc đẩy thị trường bất động sản phát triển nhanh.", "Urbanization has driven the rapid development of the real estate market.", "HSK5", "housing"),
    ("保障性住房是解决低收入群体住房问题的关键。", "bǎo zhàng xìng zhù fáng shì jiě jué dī shōu rù qún tǐ zhù fáng wèn tí de guān jiàn", "Nhà ở xã hội là chìa khóa giải quyết vấn đề nhà ở cho nhóm thu nhập thấp.", "Affordable housing is key to solving housing problems for low-income groups.", "HSK5", "housing"),
    ("绿色建筑注重环保和节能。", "lǜ sè jiàn zhù zhù zhòng huán bǎo hé jié néng", "Kiến trúc xanh chú trọng bảo vệ môi trường và tiết kiệm năng lượng.", "Green architecture focuses on environmental protection and energy saving.", "HSK5", "housing"),
    # HSK6
    ("城乡二元结构导致住房资源分配严重不均。", "chéng xiāng èr yuán jié gòu dǎo zhì zhù fáng zī yuán fēn pèi yán zhòng bù jūn", "Cấu trúc nhị nguyên thành thị-nông thôn dẫn đến phân bổ nhà ở rất không đều.", "The urban-rural dual structure leads to severely unequal distribution of housing resources.", "HSK6", "housing"),
    ("房地产泡沫一旦破裂将对经济产生连锁反应。", "fáng dì chǎn pào mò yí dàn pò liè jiāng duì jīng jì chǎn shēng lián suǒ fǎn yìng", "Bong bóng bất động sản một khi vỡ sẽ tạo phản ứng dây chuyền cho kinh tế.", "Once a real estate bubble bursts, it will have a chain reaction on the economy.", "HSK6", "housing"),

    # ==================== EMOTION ====================
    # HSK1
    ("我很高兴。", "wǒ hěn gāo xìng", "Tôi rất vui.", "I'm very happy.", "HSK1", "emotion"),
    ("我不开心。", "wǒ bù kāi xīn", "Tôi không vui.", "I'm not happy.", "HSK1", "emotion"),
    ("我很喜欢。", "wǒ hěn xǐ huan", "Tôi rất thích.", "I like it very much.", "HSK1", "emotion"),
    ("我很累。", "wǒ hěn lèi", "Tôi rất mệt.", "I'm very tired.", "HSK1", "emotion"),
    ("我想你。", "wǒ xiǎng nǐ", "Tôi nhớ bạn.", "I miss you.", "HSK1", "emotion"),
    ("别害怕。", "bié hài pà", "Đừng sợ.", "Don't be afraid.", "HSK1", "emotion"),
    ("我好开心啊！", "wǒ hǎo kāi xīn a", "Tôi vui quá!", "I'm so happy!", "HSK1", "emotion"),
    # HSK2
    ("他看起来很伤心。", "tā kàn qǐ lái hěn shāng xīn", "Anh ấy trông rất buồn.", "He looks very sad.", "HSK2", "emotion"),
    ("我对这件事很生气。", "wǒ duì zhè jiàn shì hěn shēng qì", "Tôi rất tức giận về việc này.", "I'm very angry about this.", "HSK2", "emotion"),
    ("考试让我很紧张。", "kǎo shì ràng wǒ hěn jǐn zhāng", "Thi cử làm tôi rất căng thẳng.", "Exams make me very nervous.", "HSK2", "emotion"),
    ("他感到很孤独。", "tā gǎn dào hěn gū dú", "Anh ấy cảm thấy rất cô đơn.", "He feels very lonely.", "HSK2", "emotion"),
    ("我为你感到骄傲。", "wǒ wèi nǐ gǎn dào jiāo ào", "Tôi tự hào về bạn.", "I'm proud of you.", "HSK2", "emotion"),
    ("这个消息让我很吃惊。", "zhè ge xiāo xi ràng wǒ hěn chī jīng", "Tin này khiến tôi rất ngạc nhiên.", "This news surprised me a lot.", "HSK2", "emotion"),
    ("别担心，一切都会好的。", "bié dān xīn, yí qiè dōu huì hǎo de", "Đừng lo, mọi thứ sẽ ổn thôi.", "Don't worry, everything will be fine.", "HSK2", "emotion"),
    ("我真的很感动。", "wǒ zhēn de hěn gǎn dòng", "Tôi thật sự rất cảm động.", "I'm truly moved.", "HSK2", "emotion"),
    # HSK3
    ("失败让他非常沮丧。", "shī bài ràng tā fēi cháng jǔ sàng", "Thất bại khiến anh ấy rất chán nản.", "Failure made him very depressed.", "HSK3", "emotion"),
    ("看到老朋友我非常激动。", "kàn dào lǎo péng you wǒ fēi cháng jī dòng", "Gặp lại bạn cũ tôi rất xúc động.", "I was very excited to see my old friend.", "HSK3", "emotion"),
    ("她羡慕别人的生活。", "tā xiàn mù bié rén de shēng huó", "Cô ấy ghen tị cuộc sống người khác.", "She envies other people's lives.", "HSK3", "emotion"),
    ("离别的时候大家都很难过。", "lí bié de shí hou dà jiā dōu hěn nán guò", "Lúc chia tay mọi người đều rất buồn.", "Everyone was very sad at the farewell.", "HSK3", "emotion"),
    ("我对未来充满希望。", "wǒ duì wèi lái chōng mǎn xī wàng", "Tôi tràn đầy hy vọng về tương lai.", "I'm full of hope for the future.", "HSK3", "emotion"),
    ("不要因为一次失败就放弃。", "bú yào yīn wèi yí cì shī bài jiù fàng qì", "Đừng vì một lần thất bại mà bỏ cuộc.", "Don't give up because of one failure.", "HSK3", "emotion"),
    ("成功的喜悦让他忘了疲劳。", "chéng gōng de xǐ yuè ràng tā wàng le pí láo", "Niềm vui thành công khiến anh quên mệt mỏi.", "The joy of success made him forget his fatigue.", "HSK3", "emotion"),
    # HSK4
    ("控制情绪是成熟的表现。", "kòng zhì qíng xù shì chéng shú de biǎo xiàn", "Kiểm soát cảm xúc là biểu hiện của trưởng thành.", "Controlling emotions is a sign of maturity.", "HSK4", "emotion"),
    ("人们在压力下容易产生焦虑。", "rén men zài yā lì xià róng yì chǎn shēng jiāo lǜ", "Con người dưới áp lực dễ sinh ra lo âu.", "People easily become anxious under pressure.", "HSK4", "emotion"),
    ("幸福不在于拥有多少，而在于知足。", "xìng fú bú zài yú yōng yǒu duō shǎo, ér zài yú zhī zú", "Hạnh phúc không nằm ở có bao nhiêu, mà ở biết đủ.", "Happiness is not about how much you have, but about contentment.", "HSK4", "emotion"),
    ("感恩的心态让生活更美好。", "gǎn ēn de xīn tài ràng shēng huó gèng měi hǎo", "Tâm thái biết ơn làm cuộc sống đẹp hơn.", "A grateful mindset makes life better.", "HSK4", "emotion"),
    ("失落的时候可以找朋友聊聊。", "shī luò de shí hou kě yǐ zhǎo péng you liáo liao", "Lúc buồn chán có thể tìm bạn bè trò chuyện.", "When you feel down, you can talk to friends.", "HSK4", "emotion"),
    # HSK5
    ("共情能力是人际交往中不可或缺的素质。", "gòng qíng néng lì shì rén jì jiāo wǎng zhōng bù kě huò quē de sù zhì", "Năng lực đồng cảm là phẩm chất không thể thiếu trong giao tiếp.", "Empathy is an indispensable quality in interpersonal communication.", "HSK5", "emotion"),
    ("情绪管理对个人发展和人际关系至关重要。", "qíng xù guǎn lǐ duì gè rén fā zhǎn hé rén jì guān xì zhì guān zhòng yào", "Quản lý cảm xúc rất quan trọng cho phát triển cá nhân và quan hệ.", "Emotional management is crucial for personal development and relationships.", "HSK5", "emotion"),
    ("积极乐观的态度有助于克服困难。", "jī jí lè guān de tài dù yǒu zhù yú kè fú kùn nán", "Thái độ tích cực lạc quan giúp vượt qua khó khăn.", "A positive and optimistic attitude helps overcome difficulties.", "HSK5", "emotion"),
    # HSK6
    ("情感的表达方式因文化背景的不同而存在差异。", "qíng gǎn de biǎo dá fāng shì yīn wén huà bèi jǐng de bù tóng ér cún zài chā yì", "Cách biểu đạt cảm xúc khác nhau tùy theo nền văn hóa.", "The way emotions are expressed varies due to different cultural backgrounds.", "HSK6", "emotion"),
    ("心理韧性是指个体在逆境中恢复和成长的能力。", "xīn lǐ rèn xìng shì zhǐ gè tǐ zài nì jìng zhōng huī fù hé chéng zhǎng de néng lì", "Sức bền tâm lý là năng lực phục hồi và trưởng thành trong nghịch cảnh.", "Psychological resilience refers to the ability to recover and grow in adversity.", "HSK6", "emotion"),

    # ==================== TECHNOLOGY ====================
    # HSK1
    ("我有一个手机。", "wǒ yǒu yí gè shǒu jī", "Tôi có một cái điện thoại.", "I have a phone.", "HSK1", "technology"),
    ("你会用电脑吗？", "nǐ huì yòng diàn nǎo ma", "Bạn biết dùng máy tính không?", "Can you use a computer?", "HSK1", "technology"),
    ("我在上网。", "wǒ zài shàng wǎng", "Tôi đang lên mạng.", "I'm going online.", "HSK1", "technology"),
    ("密码是什么？", "mì mǎ shì shén me", "Mật khẩu là gì?", "What's the password?", "HSK1", "technology"),
    ("给我发一条消息。", "gěi wǒ fā yì tiáo xiāo xi", "Gửi cho tôi một tin nhắn.", "Send me a message.", "HSK1", "technology"),
    ("我想拍一张照片。", "wǒ xiǎng pāi yì zhāng zhào piàn", "Tôi muốn chụp một bức ảnh.", "I want to take a photo.", "HSK1", "technology"),
    ("手机没电了。", "shǒu jī méi diàn le", "Điện thoại hết pin rồi.", "My phone is out of battery.", "HSK1", "technology"),
    # HSK2
    ("我用微信跟朋友聊天。", "wǒ yòng wēi xìn gēn péng you liáo tiān", "Tôi dùng WeChat nói chuyện với bạn bè.", "I use WeChat to chat with friends.", "HSK2", "technology"),
    ("这个应用很好用。", "zhè ge yìng yòng hěn hǎo yòng", "Ứng dụng này rất dễ dùng.", "This app is very useful.", "HSK2", "technology"),
    ("网速很慢。", "wǎng sù hěn màn", "Tốc độ mạng rất chậm.", "The internet speed is very slow.", "HSK2", "technology"),
    ("我在手机上看视频。", "wǒ zài shǒu jī shàng kàn shì pín", "Tôi xem video trên điện thoại.", "I watch videos on my phone.", "HSK2", "technology"),
    ("你的电脑是什么牌子的？", "nǐ de diàn nǎo shì shén me pái zi de", "Máy tính bạn hãng nào?", "What brand is your computer?", "HSK2", "technology"),
    ("我下载了一个新的应用。", "wǒ xià zài le yí gè xīn de yìng yòng", "Tôi tải về một ứng dụng mới.", "I downloaded a new app.", "HSK2", "technology"),
    ("扫码支付很方便。", "sǎo mǎ zhī fù hěn fāng biàn", "Quét mã thanh toán rất tiện.", "QR code payment is very convenient.", "HSK2", "technology"),
    ("请关注我们的公众号。", "qǐng guān zhù wǒ men de gōng zhòng hào", "Mời theo dõi tài khoản công chúng của chúng tôi.", "Please follow our official account.", "HSK2", "technology"),
    # HSK3
    ("网络购物改变了人们的消费习惯。", "wǎng luò gòu wù gǎi biàn le rén men de xiāo fèi xí guàn", "Mua sắm mạng thay đổi thói quen tiêu dùng của mọi người.", "Online shopping has changed people's consumption habits.", "HSK3", "technology"),
    ("我想换一部新手机。", "wǒ xiǎng huàn yí bù xīn shǒu jī", "Tôi muốn đổi một chiếc điện thoại mới.", "I want to get a new phone.", "HSK3", "technology"),
    ("智能手机的功能越来越多。", "zhì néng shǒu jī de gōng néng yuè lái yuè duō", "Chức năng điện thoại thông minh ngày càng nhiều.", "Smartphones have more and more features.", "HSK3", "technology"),
    ("网络直播现在很流行。", "wǎng luò zhí bō xiàn zài hěn liú xíng", "Livestream hiện nay rất phổ biến.", "Live streaming is very popular now.", "HSK3", "technology"),
    ("我的电脑中毒了。", "wǒ de diàn nǎo zhōng dú le", "Máy tính tôi bị nhiễm virus rồi.", "My computer got a virus.", "HSK3", "technology"),
    ("在线教育让学习不受地点限制。", "zài xiàn jiào yù ràng xué xí bú shòu dì diǎn xiàn zhì", "Giáo dục trực tuyến giúp học tập không bị giới hạn địa điểm.", "Online education removes location limitations for learning.", "HSK3", "technology"),
    ("导航软件帮我找到了路。", "dǎo háng ruǎn jiàn bāng wǒ zhǎo dào le lù", "Phần mềm dẫn đường giúp tôi tìm được đường.", "The navigation app helped me find the way.", "HSK3", "technology"),
    # HSK4
    ("人工智能正在改变各个行业。", "rén gōng zhì néng zhèng zài gǎi biàn gè ge háng yè", "Trí tuệ nhân tạo đang thay đổi mọi ngành nghề.", "Artificial intelligence is changing every industry.", "HSK4", "technology"),
    ("大数据分析帮助企业做出更好的决策。", "dà shù jù fēn xī bāng zhù qǐ yè zuò chū gèng hǎo de jué cè", "Phân tích dữ liệu lớn giúp doanh nghiệp đưa ra quyết định tốt hơn.", "Big data analysis helps companies make better decisions.", "HSK4", "technology"),
    ("网络安全问题越来越受到重视。", "wǎng luò ān quán wèn tí yuè lái yuè shòu dào zhòng shì", "Vấn đề an ninh mạng ngày càng được coi trọng.", "Cybersecurity issues are getting more attention.", "HSK4", "technology"),
    ("自动驾驶技术正在快速发展。", "zì dòng jià shǐ jì shù zhèng zài kuài sù fā zhǎn", "Công nghệ lái xe tự động đang phát triển nhanh.", "Self-driving technology is developing rapidly.", "HSK4", "technology"),
    ("5G网络让下载速度变得更快。", "wǔ jī wǎng luò ràng xià zǎi sù dù biàn de gèng kuài", "Mạng 5G giúp tốc độ tải xuống nhanh hơn.", "5G networks make download speeds faster.", "HSK4", "technology"),
    ("很多人用手机支付代替了现金。", "hěn duō rén yòng shǒu jī zhī fù dài tì le xiàn jīn", "Nhiều người dùng thanh toán di động thay thế tiền mặt.", "Many people use mobile payment instead of cash.", "HSK4", "technology"),
    # HSK5
    ("区块链技术有望革新金融行业。", "qū kuài liàn jì shù yǒu wàng gé xīn jīn róng háng yè", "Công nghệ blockchain có triển vọng cách mạng ngành tài chính.", "Blockchain technology is expected to revolutionize the financial industry.", "HSK5", "technology"),
    ("物联网将各种设备连接在一起。", "wù lián wǎng jiāng gè zhǒng shè bèi lián jiē zài yì qǐ", "IoT kết nối các thiết bị khác nhau với nhau.", "The Internet of Things connects various devices together.", "HSK5", "technology"),
    ("算法偏见是人工智能面临的伦理问题。", "suàn fǎ piān jiàn shì rén gōng zhì néng miàn lín de lún lǐ wèn tí", "Thiên lệch thuật toán là vấn đề đạo đức AI phải đối mặt.", "Algorithmic bias is an ethical issue facing artificial intelligence.", "HSK5", "technology"),
    ("云计算降低了企业的IT基础设施成本。", "yún jì suàn jiàng dī le qǐ yè de IT jī chǔ shè shī chéng běn", "Điện toán đám mây giảm chi phí hạ tầng CNTT cho doanh nghiệp.", "Cloud computing has reduced IT infrastructure costs for businesses.", "HSK5", "technology"),
    # HSK6
    ("量子计算有可能颠覆现有的密码学体系。", "liàng zǐ jì suàn yǒu kě néng diān fù xiàn yǒu de mì mǎ xué tǐ xì", "Máy tính lượng tử có thể lật đổ hệ thống mật mã học hiện có.", "Quantum computing could potentially disrupt existing cryptographic systems.", "HSK6", "technology"),
    ("数字鸿沟加剧了社会不平等。", "shù zì hóng gōu jiā jù le shè huì bù píng děng", "Khoảng cách số làm trầm trọng thêm bất bình đẳng xã hội.", "The digital divide exacerbates social inequality.", "HSK6", "technology"),
    ("人机协作将成为未来工作的主要模式。", "rén jī xié zuò jiāng chéng wéi wèi lái gōng zuò de zhǔ yào mó shì", "Hợp tác người-máy sẽ trở thành mô hình làm việc chính trong tương lai.", "Human-machine collaboration will become the main working model in the future.", "HSK6", "technology"),

    # ==================== CULTURE ====================
    # HSK1
    ("中国有五千年历史。", "zhōng guó yǒu wǔ qiān nián lì shǐ", "Trung Quốc có năm nghìn năm lịch sử.", "China has five thousand years of history.", "HSK1", "culture"),
    ("春节是中国最重要的节日。", "chūn jié shì zhōng guó zuì zhòng yào de jié rì", "Tết Nguyên Đán là ngày lễ quan trọng nhất Trung Quốc.", "Spring Festival is China's most important holiday.", "HSK1", "culture"),
    ("中国人过年吃饺子。", "zhōng guó rén guò nián chī jiǎo zi", "Người Trung Quốc ăn Tết ăn sủi cảo.", "Chinese people eat dumplings during New Year.", "HSK1", "culture"),
    ("红色在中国代表吉祥。", "hóng sè zài zhōng guó dài biǎo jí xiáng", "Màu đỏ ở Trung Quốc tượng trưng cho may mắn.", "Red represents good luck in China.", "HSK1", "culture"),
    ("我喜欢中国功夫。", "wǒ xǐ huan zhōng guó gōng fu", "Tôi thích võ thuật Trung Quốc.", "I like Chinese kung fu.", "HSK1", "culture"),
    ("龙是中国的象征。", "lóng shì zhōng guó de xiàng zhēng", "Rồng là biểu tượng của Trung Quốc.", "The dragon is a symbol of China.", "HSK1", "culture"),
    # HSK2
    ("中秋节要吃月饼。", "zhōng qiū jié yào chī yuè bǐng", "Tết Trung Thu phải ăn bánh trung thu.", "You eat mooncakes during the Mid-Autumn Festival.", "HSK2", "culture"),
    ("书法是中国传统艺术。", "shū fǎ shì zhōng guó chuán tǒng yì shù", "Thư pháp là nghệ thuật truyền thống Trung Quốc.", "Calligraphy is a traditional Chinese art.", "HSK2", "culture"),
    ("端午节赛龙舟。", "duān wǔ jié sài lóng zhōu", "Tết Đoan Ngọ đua thuyền rồng.", "Dragon boat races are held during the Dragon Boat Festival.", "HSK2", "culture"),
    ("中国有很多少数民族。", "zhōng guó yǒu hěn duō shǎo shù mín zú", "Trung Quốc có rất nhiều dân tộc thiểu số.", "China has many ethnic minorities.", "HSK2", "culture"),
    ("京剧是中国的国粹。", "jīng jù shì zhōng guó de guó cuì", "Kinh kịch là quốc túy của Trung Quốc.", "Peking Opera is a Chinese national treasure.", "HSK2", "culture"),
    ("中国的茶文化历史悠久。", "zhōng guó de chá wén huà lì shǐ yōu jiǔ", "Văn hóa trà Trung Quốc lịch sử lâu đời.", "China's tea culture has a long history.", "HSK2", "culture"),
    ("过年的时候放鞭炮。", "guò nián de shí hou fàng biān pào", "Lúc ăn Tết đốt pháo.", "Firecrackers are set off during New Year.", "HSK2", "culture"),
    ("长辈给小孩红包。", "zhǎng bèi gěi xiǎo hái hóng bāo", "Người lớn cho trẻ con lì xì.", "Elders give children red envelopes.", "HSK2", "culture"),
    # HSK3
    ("太极拳是一种传统的健身运动。", "tài jí quán shì yì zhǒng chuán tǒng de jiàn shēn yùn dòng", "Thái cực quyền là một môn thể dục truyền thống.", "Tai Chi is a traditional form of exercise.", "HSK3", "culture"),
    ("中国的四大发明对世界影响很大。", "zhōng guó de sì dà fā míng duì shì jiè yǐng xiǎng hěn dà", "Bốn phát minh lớn của Trung Quốc ảnh hưởng rất lớn đến thế giới.", "China's four great inventions had a great impact on the world.", "HSK3", "culture"),
    ("清明节是祭祀祖先的日子。", "qīng míng jié shì jì sì zǔ xiān de rì zi", "Tết Thanh Minh là ngày tế tổ tiên.", "Qingming Festival is a day for honoring ancestors.", "HSK3", "culture"),
    ("中国画和西方画的风格很不一样。", "zhōng guó huà hé xī fāng huà de fēng gé hěn bù yí yàng", "Tranh Trung Quốc và tranh phương Tây phong cách rất khác nhau.", "Chinese painting and Western painting have very different styles.", "HSK3", "culture"),
    ("中国的筷子文化源远流长。", "zhōng guó de kuài zi wén huà yuán yuǎn liú cháng", "Văn hóa đũa Trung Quốc có nguồn gốc lâu đời.", "China's chopstick culture has a long history.", "HSK3", "culture"),
    ("十二生肖是中国传统文化的一部分。", "shí èr shēng xiào shì zhōng guó chuán tǒng wén huà de yí bù fen", "Mười hai con giáp là một phần văn hóa truyền thống Trung Quốc.", "The twelve zodiac animals are part of traditional Chinese culture.", "HSK3", "culture"),
    # HSK4
    ("儒家思想深刻影响了东亚各国的文化。", "rú jiā sī xiǎng shēn kè yǐng xiǎng le dōng yà gè guó de wén huà", "Tư tưởng Nho gia ảnh hưởng sâu sắc đến văn hóa các nước Đông Á.", "Confucian thought has profoundly influenced East Asian cultures.", "HSK4", "culture"),
    ("丝绸之路促进了东西方的文化交流。", "sī chóu zhī lù cù jìn le dōng xī fāng de wén huà jiāo liú", "Con đường Tơ Lụa thúc đẩy giao lưu văn hóa Đông Tây.", "The Silk Road promoted cultural exchange between East and West.", "HSK4", "culture"),
    ("非物质文化遗产需要加强保护。", "fēi wù zhì wén huà yí chǎn xū yào jiā qiáng bǎo hù", "Di sản văn hóa phi vật thể cần được tăng cường bảo vệ.", "Intangible cultural heritage needs to be better protected.", "HSK4", "culture"),
    ("中医和西医各有优势。", "zhōng yī hé xī yī gè yǒu yōu shì", "Y học Trung và Tây mỗi bên đều có ưu thế.", "Traditional Chinese and Western medicine each have their advantages.", "HSK4", "culture"),
    ("传统节日承载着丰富的文化内涵。", "chuán tǒng jié rì chéng zài zhe fēng fù de wén huà nèi hán", "Ngày lễ truyền thống mang theo nội hàm văn hóa phong phú.", "Traditional festivals carry rich cultural connotations.", "HSK4", "culture"),
    ("中华文明是世界上最古老的文明之一。", "zhōng huá wén míng shì shì jiè shàng zuì gǔ lǎo de wén míng zhī yī", "Văn minh Trung Hoa là một trong những nền văn minh cổ nhất thế giới.", "Chinese civilization is one of the oldest civilizations in the world.", "HSK4", "culture"),
    # HSK5
    ("全球化背景下，文化多样性的保护尤为重要。", "quán qiú huà bèi jǐng xià, wén huà duō yàng xìng de bǎo hù yóu wéi zhòng yào", "Trong bối cảnh toàn cầu hóa, bảo vệ đa dạng văn hóa đặc biệt quan trọng.", "In the context of globalization, preserving cultural diversity is especially important.", "HSK5", "culture"),
    ("跨文化交际能力是21世纪的核心素养。", "kuà wén huà jiāo jì néng lì shì èr shí yī shì jì de hé xīn sù yǎng", "Năng lực giao tiếp liên văn hóa là phẩm chất cốt lõi thế kỷ 21.", "Cross-cultural communication ability is a core competency of the 21st century.", "HSK5", "culture"),
    ("文化输出需要创新形式来适应现代传播方式。", "wén huà shū chū xū yào chuàng xīn xíng shì lái shì yìng xiàn dài chuán bō fāng shì", "Xuất khẩu văn hóa cần hình thức sáng tạo để thích ứng truyền thông hiện đại.", "Cultural export needs innovative forms to adapt to modern media.", "HSK5", "culture"),
    # HSK6
    ("文化认同危机是后殖民时代的重要议题。", "wén huà rèn tóng wēi jī shì hòu zhí mín shí dài de zhòng yào yì tí", "Khủng hoảng nhận dạng văn hóa là vấn đề quan trọng thời hậu thuộc địa.", "Cultural identity crisis is an important issue in the post-colonial era.", "HSK6", "culture"),
    ("文化软实力在国际竞争中发挥着越来越重要的作用。", "wén huà ruǎn shí lì zài guó jì jìng zhēng zhōng fā huī zhe yuè lái yuè zhòng yào de zuò yòng", "Sức mạnh mềm văn hóa đóng vai trò ngày càng quan trọng trong cạnh tranh quốc tế.", "Cultural soft power plays an increasingly important role in international competition.", "HSK6", "culture"),

    # ==================== BUSINESS ====================
    # HSK2
    ("我在一家公司上班。", "wǒ zài yì jiā gōng sī shàng bān", "Tôi làm việc ở một công ty.", "I work at a company.", "HSK2", "business"),
    ("老板明天来开会。", "lǎo bǎn míng tiān lái kāi huì", "Sếp ngày mai đến họp.", "The boss comes for a meeting tomorrow.", "HSK2", "business"),
    ("我们要签合同。", "wǒ men yào qiān hé tong", "Chúng tôi phải ký hợp đồng.", "We need to sign a contract.", "HSK2", "business"),
    # HSK3
    ("这个项目的投资回报率很高。", "zhè ge xiàng mù de tóu zī huí bào lǜ hěn gāo", "Tỷ suất lợi nhuận đầu tư dự án này rất cao.", "The return on investment for this project is very high.", "HSK3", "business"),
    ("我们需要做一份市场调查。", "wǒ men xū yào zuò yí fèn shì chǎng diào chá", "Chúng tôi cần làm một cuộc khảo sát thị trường.", "We need to do a market survey.", "HSK3", "business"),
    ("公司决定开拓海外市场。", "gōng sī jué dìng kāi tuò hǎi wài shì chǎng", "Công ty quyết định mở rộng thị trường nước ngoài.", "The company decided to expand into overseas markets.", "HSK3", "business"),
    ("这份合同的条件很优惠。", "zhè fèn hé tong de tiáo jiàn hěn yōu huì", "Điều kiện hợp đồng này rất ưu đãi.", "The terms of this contract are very favorable.", "HSK3", "business"),
    ("请把商业计划书发给我。", "qǐng bǎ shāng yè jì huà shū fā gěi wǒ", "Xin gửi cho tôi bản kế hoạch kinh doanh.", "Please send me the business plan.", "HSK3", "business"),
    ("我们公司的产品出口到很多国家。", "wǒ men gōng sī de chǎn pǐn chū kǒu dào hěn duō guó jiā", "Sản phẩm công ty chúng tôi xuất khẩu đến nhiều nước.", "Our company's products are exported to many countries.", "HSK3", "business"),
    ("客户对我们的服务很满意。", "kè hù duì wǒ men de fú wù hěn mǎn yì", "Khách hàng rất hài lòng với dịch vụ của chúng tôi.", "Customers are very satisfied with our service.", "HSK3", "business"),
    # HSK4
    ("企业的核心竞争力在于创新。", "qǐ yè de hé xīn jìng zhēng lì zài yú chuàng xīn", "Sức cạnh tranh cốt lõi của doanh nghiệp nằm ở đổi mới.", "The core competitiveness of enterprises lies in innovation.", "HSK4", "business"),
    ("品牌形象对公司的长期发展至关重要。", "pǐn pái xíng xiàng duì gōng sī de cháng qī fā zhǎn zhì guān zhòng yào", "Hình ảnh thương hiệu rất quan trọng cho phát triển lâu dài.", "Brand image is crucial for a company's long-term development.", "HSK4", "business"),
    ("这次谈判的结果对双方都有利。", "zhè cì tán pàn de jié guǒ duì shuāng fāng dōu yǒu lì", "Kết quả đàm phán lần này có lợi cho cả hai bên.", "The result of this negotiation benefits both sides.", "HSK4", "business"),
    ("公司正在进行战略调整。", "gōng sī zhèng zài jìn xíng zhàn lüè tiáo zhěng", "Công ty đang tiến hành điều chỉnh chiến lược.", "The company is undergoing strategic adjustment.", "HSK4", "business"),
    ("中小企业面临融资困难的问题。", "zhōng xiǎo qǐ yè miàn lín róng zī kùn nán de wèn tí", "Doanh nghiệp vừa và nhỏ đối mặt khó khăn huy động vốn.", "Small and medium enterprises face financing difficulties.", "HSK4", "business"),
    ("良好的企业管理制度是成功的基础。", "liáng hǎo de qǐ yè guǎn lǐ zhì dù shì chéng gōng de jī chǔ", "Chế độ quản lý doanh nghiệp tốt là nền tảng thành công.", "Good corporate management systems are the foundation of success.", "HSK4", "business"),
    # HSK5
    ("全球供应链的中断对国际贸易造成了严重影响。", "quán qiú gōng yìng liàn de zhōng duàn duì guó jì mào yì zào chéng le yán zhòng yǐng xiǎng", "Đứt gãy chuỗi cung ứng toàn cầu gây ảnh hưởng nghiêm trọng đến thương mại quốc tế.", "Global supply chain disruptions have severely impacted international trade.", "HSK5", "business"),
    ("企业社会责任已成为衡量企业价值的重要标准。", "qǐ yè shè huì zé rèn yǐ chéng wéi héng liáng qǐ yè jià zhí de zhòng yào biāo zhǔn", "Trách nhiệm xã hội doanh nghiệp đã trở thành tiêu chuẩn đánh giá giá trị doanh nghiệp.", "Corporate social responsibility has become an important standard for measuring corporate value.", "HSK5", "business"),
    ("数字化转型是传统企业面临的必然趋势。", "shù zì huà zhuǎn xíng shì chuán tǒng qǐ yè miàn lín de bì rán qū shì", "Chuyển đổi số là xu hướng tất yếu doanh nghiệp truyền thống phải đối mặt.", "Digital transformation is an inevitable trend for traditional enterprises.", "HSK5", "business"),
    ("风险管理是企业经营中不可忽视的环节。", "fēng xiǎn guǎn lǐ shì qǐ yè jīng yíng zhōng bù kě hū shì de huán jié", "Quản lý rủi ro là khâu không thể bỏ qua trong kinh doanh.", "Risk management is an aspect that cannot be ignored in business operations.", "HSK5", "business"),
    # HSK6
    ("垄断行为扭曲了市场竞争机制。", "lǒng duàn xíng wéi niǔ qū le shì chǎng jìng zhēng jī zhì", "Hành vi độc quyền bóp méo cơ chế cạnh tranh thị trường.", "Monopolistic behavior distorts market competition mechanisms.", "HSK6", "business"),
    ("新兴市场的崛起正在重塑全球经济格局。", "xīn xīng shì chǎng de jué qǐ zhèng zài chóng sù quán qiú jīng jì gé jú", "Sự trỗi dậy của thị trường mới nổi đang tái định hình cục diện kinh tế toàn cầu.", "The rise of emerging markets is reshaping the global economic landscape.", "HSK6", "business"),
    ("可持续发展理念正在深刻影响企业的经营策略。", "kě chí xù fā zhǎn lǐ niàn zhèng zài shēn kè yǐng xiǎng qǐ yè de jīng yíng cè lüè", "Lý niệm phát triển bền vững đang ảnh hưởng sâu sắc chiến lược kinh doanh.", "The concept of sustainable development is profoundly influencing business strategies.", "HSK6", "business"),

    # ==================== FINANCE ====================
    # HSK2
    ("我想去银行。", "wǒ xiǎng qù yín háng", "Tôi muốn đi ngân hàng.", "I want to go to the bank.", "HSK2", "finance"),
    ("我要换钱。", "wǒ yào huàn qián", "Tôi muốn đổi tiền.", "I want to exchange money.", "HSK2", "finance"),
    ("你有零钱吗？", "nǐ yǒu líng qián ma", "Bạn có tiền lẻ không?", "Do you have change?", "HSK2", "finance"),
    # HSK3
    ("我想开一个银行账户。", "wǒ xiǎng kāi yí gè yín háng zhàng hù", "Tôi muốn mở một tài khoản ngân hàng.", "I want to open a bank account.", "HSK3", "finance"),
    ("人民币对美元的汇率是多少？", "rén mín bì duì měi yuán de huì lǜ shì duō shǎo", "Tỷ giá nhân dân tệ đổi đô la Mỹ là bao nhiêu?", "What is the exchange rate of RMB to USD?", "HSK3", "finance"),
    ("每个月要存一点钱。", "měi gè yuè yào cún yì diǎn qián", "Mỗi tháng phải tiết kiệm một chút.", "You should save some money every month.", "HSK3", "finance"),
    ("信用卡的利息很高。", "xìn yòng kǎ de lì xī hěn gāo", "Lãi suất thẻ tín dụng rất cao.", "Credit card interest rates are very high.", "HSK3", "finance"),
    ("我每月的开销太大了。", "wǒ měi yuè de kāi xiāo tài dà le", "Chi tiêu hàng tháng của tôi quá lớn.", "My monthly expenses are too high.", "HSK3", "finance"),
    ("你有预算吗？", "nǐ yǒu yù suàn ma", "Bạn có ngân sách không?", "Do you have a budget?", "HSK3", "finance"),
    # HSK4
    ("投资有风险，入市需谨慎。", "tóu zī yǒu fēng xiǎn, rù shì xū jǐn shèn", "Đầu tư có rủi ro, vào thị trường cần thận trọng.", "Investment has risks; entering the market requires caution.", "HSK4", "finance"),
    ("股票市场的波动很大。", "gǔ piào shì chǎng de bō dòng hěn dà", "Biến động thị trường chứng khoán rất lớn.", "The stock market fluctuates a lot.", "HSK4", "finance"),
    ("通货膨胀影响了人们的购买力。", "tōng huò péng zhàng yǐng xiǎng le rén men de gòu mǎi lì", "Lạm phát ảnh hưởng đến sức mua của mọi người.", "Inflation has affected people's purchasing power.", "HSK4", "finance"),
    ("他通过理财让资产增值了。", "tā tōng guò lǐ cái ràng zī chǎn zēng zhí le", "Anh ấy nhờ quản lý tài chính mà tài sản tăng giá trị.", "He increased his assets through financial management.", "HSK4", "finance"),
    ("贷款利率最近有所下降。", "dài kuǎn lì lǜ zuì jìn yǒu suǒ xià jiàng", "Lãi suất cho vay gần đây đã giảm.", "Loan interest rates have recently decreased.", "HSK4", "finance"),
    ("保险可以帮助我们规避风险。", "bǎo xiǎn kě yǐ bāng zhù wǒ men guī bì fēng xiǎn", "Bảo hiểm có thể giúp chúng ta phòng tránh rủi ro.", "Insurance can help us avoid risks.", "HSK4", "finance"),
    # HSK5
    ("央行通过调整利率来调控宏观经济。", "yāng háng tōng guò tiáo zhěng lì lǜ lái tiáo kòng hóng guān jīng jì", "Ngân hàng trung ương điều chỉnh lãi suất để điều tiết kinh tế vĩ mô.", "The central bank regulates the macroeconomy by adjusting interest rates.", "HSK5", "finance"),
    ("金融科技正在颠覆传统银行业。", "jīn róng kē jì zhèng zài diān fù chuán tǒng yín háng yè", "Fintech đang lật đổ ngành ngân hàng truyền thống.", "Fintech is disrupting the traditional banking industry.", "HSK5", "finance"),
    ("资产配置多元化可以降低投资风险。", "zī chǎn pèi zhì duō yuán huà kě yǐ jiàng dī tóu zī fēng xiǎn", "Phân bổ tài sản đa dạng hóa có thể giảm rủi ro đầu tư.", "Diversified asset allocation can reduce investment risks.", "HSK5", "finance"),
    ("外汇市场是全球最大的金融市场。", "wài huì shì chǎng shì quán qiú zuì dà de jīn róng shì chǎng", "Thị trường ngoại hối là thị trường tài chính lớn nhất toàn cầu.", "The foreign exchange market is the world's largest financial market.", "HSK5", "finance"),
    # HSK6
    ("影子银行体系的膨胀加大了系统性金融风险。", "yǐng zi yín háng tǐ xì de péng zhàng jiā dà le xì tǒng xìng jīn róng fēng xiǎn", "Hệ thống ngân hàng bóng mở rộng làm tăng rủi ro tài chính hệ thống.", "The expansion of the shadow banking system has increased systemic financial risks.", "HSK6", "finance"),
    ("去杠杆化是防范金融危机的重要手段。", "qù gàng gǎn huà shì fáng fàn jīn róng wēi jī de zhòng yào shǒu duàn", "Giảm đòn bẩy là biện pháp quan trọng phòng ngừa khủng hoảng tài chính.", "Deleveraging is an important measure to prevent financial crises.", "HSK6", "finance"),
    ("数字货币的兴起对传统货币体系构成了挑战。", "shù zì huò bì de xīng qǐ duì chuán tǒng huò bì tǐ xì gòu chéng le tiǎo zhàn", "Sự nổi lên của tiền kỹ thuật số thách thức hệ thống tiền tệ truyền thống.", "The rise of digital currency poses challenges to the traditional monetary system.", "HSK6", "finance"),

    # ==================== TRANSPORT ====================
    # HSK1
    ("我坐公共汽车去。", "wǒ zuò gōng gòng qì chē qù", "Tôi đi xe buýt.", "I take the bus.", "HSK1", "transport"),
    ("出租车在哪里？", "chū zū chē zài nǎ lǐ", "Taxi ở đâu?", "Where is the taxi?", "HSK1", "transport"),
    ("我骑自行车去学校。", "wǒ qí zì xíng chē qù xué xiào", "Tôi đạp xe đi học.", "I ride a bicycle to school.", "HSK1", "transport"),
    ("地铁站在前面。", "dì tiě zhàn zài qián miàn", "Ga tàu điện ngầm ở phía trước.", "The subway station is ahead.", "HSK1", "transport"),
    ("请问，去火车站怎么走？", "qǐng wèn, qù huǒ chē zhàn zěn me zǒu", "Xin hỏi, đi ga tàu thế nào?", "Excuse me, how do I get to the train station?", "HSK1", "transport"),
    ("我走路去。", "wǒ zǒu lù qù", "Tôi đi bộ.", "I'll walk there.", "HSK1", "transport"),
    # HSK2
    ("这趟公交车到火车站吗？", "zhè tàng gōng jiāo chē dào huǒ chē zhàn ma", "Xe buýt này có đến ga tàu không?", "Does this bus go to the train station?", "HSK2", "transport"),
    ("下一站是哪里？", "xià yí zhàn shì nǎ lǐ", "Trạm tiếp theo là đâu?", "What's the next stop?", "HSK2", "transport"),
    ("地铁比公交车快。", "dì tiě bǐ gōng jiāo chē kuài", "Tàu điện ngầm nhanh hơn xe buýt.", "The subway is faster than the bus.", "HSK2", "transport"),
    ("路上堵车了。", "lù shàng dǔ chē le", "Đường bị kẹt xe rồi.", "There's a traffic jam on the road.", "HSK2", "transport"),
    ("我在这里下车。", "wǒ zài zhè lǐ xià chē", "Tôi xuống xe ở đây.", "I'll get off here.", "HSK2", "transport"),
    ("红灯停，绿灯行。", "hóng dēng tíng, lǜ dēng xíng", "Đèn đỏ dừng, đèn xanh đi.", "Stop at red, go at green.", "HSK2", "transport"),
    ("请系好安全带。", "qǐng jì hǎo ān quán dài", "Xin thắt dây an toàn.", "Please fasten your seatbelt.", "HSK2", "transport"),
    # HSK3
    ("高铁的速度非常快。", "gāo tiě de sù dù fēi cháng kuài", "Tốc độ tàu cao tốc rất nhanh.", "High-speed trains are very fast.", "HSK3", "transport"),
    ("共享单车改变了人们的出行方式。", "gòng xiǎng dān chē gǎi biàn le rén men de chū xíng fāng shì", "Xe đạp chia sẻ thay đổi phương thức di chuyển của mọi người.", "Bike-sharing has changed people's way of getting around.", "HSK3", "transport"),
    ("上下班高峰期地铁很挤。", "shàng xià bān gāo fēng qī dì tiě hěn jǐ", "Giờ cao điểm đi làm tàu điện ngầm rất đông.", "The subway is very crowded during rush hour.", "HSK3", "transport"),
    ("请问这里有停车场吗？", "qǐng wèn zhè lǐ yǒu tíng chē chǎng ma", "Xin hỏi ở đây có bãi đỗ xe không?", "Is there a parking lot here?", "HSK3", "transport"),
    ("我的航班延误了两个小时。", "wǒ de háng bān yán wù le liǎng gè xiǎo shí", "Chuyến bay của tôi bị trễ hai tiếng.", "My flight was delayed by two hours.", "HSK3", "transport"),
    ("打车软件让出行更方便了。", "dǎ chē ruǎn jiàn ràng chū xíng gèng fāng biàn le", "Ứng dụng gọi xe giúp đi lại tiện hơn.", "Ride-hailing apps make travel more convenient.", "HSK3", "transport"),
    # HSK4
    ("城市交通拥堵是大城市的通病。", "chéng shì jiāo tōng yōng dǔ shì dà chéng shì de tōng bìng", "Tắc nghẽn giao thông là bệnh chung thành phố lớn.", "Traffic congestion is a common problem in big cities.", "HSK4", "transport"),
    ("新能源汽车越来越受欢迎。", "xīn néng yuán qì chē yuè lái yuè shòu huān yíng", "Xe ô tô năng lượng mới ngày càng được ưa chuộng.", "New energy vehicles are becoming more popular.", "HSK4", "transport"),
    ("城市轨道交通的建设有助于缓解交通压力。", "chéng shì guǐ dào jiāo tōng de jiàn shè yǒu zhù yú huǎn jiě jiāo tōng yā lì", "Xây dựng đường sắt đô thị giúp giảm áp lực giao thông.", "Urban rail construction helps alleviate traffic pressure.", "HSK4", "transport"),
    ("无人驾驶出租车开始在部分城市试运行。", "wú rén jià shǐ chū zū chē kāi shǐ zài bù fèn chéng shì shì yùn xíng", "Taxi không người lái bắt đầu thử nghiệm ở một số thành phố.", "Driverless taxis have begun trial operations in some cities.", "HSK4", "transport"),
    # HSK5
    ("综合交通枢纽的规划对城市发展具有战略意义。", "zōng hé jiāo tōng shū niǔ de guī huà duì chéng shì fā zhǎn jù yǒu zhàn lüè yì yì", "Quy hoạch đầu mối giao thông tổng hợp có ý nghĩa chiến lược cho phát triển đô thị.", "Planning of comprehensive transportation hubs has strategic significance for urban development.", "HSK5", "transport"),
    ("碳排放标准的提高推动了交通工具的绿色转型。", "tàn pái fàng biāo zhǔn de tí gāo tuī dòng le jiāo tōng gōng jù de lǜ sè zhuǎn xíng", "Nâng cao tiêu chuẩn phát thải carbon thúc đẩy chuyển đổi xanh phương tiện giao thông.", "Higher carbon emission standards have driven the green transformation of transportation.", "HSK5", "transport"),
    # HSK6
    ("智慧交通系统通过大数据优化城市出行效率。", "zhì huì jiāo tōng xì tǒng tōng guò dà shù jù yōu huà chéng shì chū xíng xiào lǜ", "Hệ thống giao thông thông minh tối ưu hóa hiệu suất di chuyển qua dữ liệu lớn.", "Smart transportation systems optimize urban travel efficiency through big data.", "HSK6", "transport"),
    ("超级高铁的研发有望实现陆路交通的革命性突破。", "chāo jí gāo tiě de yán fā yǒu wàng shí xiàn lù lù jiāo tōng de gé mìng xìng tū pò", "Nghiên cứu tàu siêu tốc có triển vọng đột phá cách mạng giao thông đường bộ.", "Hyperloop development could achieve a revolutionary breakthrough in land transportation.", "HSK6", "transport"),

    # ==================== ENVIRONMENT ====================
    # HSK2
    ("天空很蓝。", "tiān kōng hěn lán", "Bầu trời rất xanh.", "The sky is very blue.", "HSK2", "environment"),
    ("这里的花很漂亮。", "zhè lǐ de huā hěn piào liang", "Hoa ở đây rất đẹp.", "The flowers here are beautiful.", "HSK2", "environment"),
    ("山上的空气很新鲜。", "shān shàng de kōng qì hěn xīn xiān", "Không khí trên núi rất trong lành.", "The air on the mountain is very fresh.", "HSK2", "environment"),
    # HSK3
    ("保护环境是每个人的责任。", "bǎo hù huán jìng shì měi gè rén de zé rèn", "Bảo vệ môi trường là trách nhiệm mỗi người.", "Protecting the environment is everyone's responsibility.", "HSK3", "environment"),
    ("我们应该少用塑料袋。", "wǒ men yīng gāi shǎo yòng sù liào dài", "Chúng ta nên dùng ít túi nhựa.", "We should use fewer plastic bags.", "HSK3", "environment"),
    ("垃圾分类有利于环保。", "lā jī fēn lèi yǒu lì yú huán bǎo", "Phân loại rác có lợi cho bảo vệ môi trường.", "Waste sorting is beneficial for environmental protection.", "HSK3", "environment"),
    ("请不要浪费水资源。", "qǐng bú yào làng fèi shuǐ zī yuán", "Xin đừng lãng phí tài nguyên nước.", "Please don't waste water resources.", "HSK3", "environment"),
    ("种树可以净化空气。", "zhòng shù kě yǐ jìng huà kōng qì", "Trồng cây có thể thanh lọc không khí.", "Planting trees can purify the air.", "HSK3", "environment"),
    ("河水被污染了。", "hé shuǐ bèi wū rǎn le", "Nước sông bị ô nhiễm rồi.", "The river water has been polluted.", "HSK3", "environment"),
    # HSK4
    ("全球变暖是人类面临的最大环境挑战。", "quán qiú biàn nuǎn shì rén lèi miàn lín de zuì dà huán jìng tiǎo zhàn", "Nóng lên toàn cầu là thách thức môi trường lớn nhất nhân loại phải đối mặt.", "Global warming is the biggest environmental challenge humanity faces.", "HSK4", "environment"),
    ("太阳能和风能是清洁的可再生能源。", "tài yáng néng hé fēng néng shì qīng jié de kě zài shēng néng yuán", "Năng lượng mặt trời và gió là năng lượng tái tạo sạch.", "Solar and wind energy are clean renewable energy sources.", "HSK4", "environment"),
    ("很多动物因为栖息地被破坏而濒临灭绝。", "hěn duō dòng wù yīn wèi qī xī dì bèi pò huài ér bīn lín miè jué", "Nhiều loài động vật vì nơi cư trú bị phá hủy mà sắp tuyệt chủng.", "Many animals are on the verge of extinction due to habitat destruction.", "HSK4", "environment"),
    ("减少碳排放是应对气候变化的关键。", "jiǎn shǎo tàn pái fàng shì yìng duì qì hòu biàn huà de guān jiàn", "Giảm phát thải carbon là chìa khóa ứng phó biến đổi khí hậu.", "Reducing carbon emissions is key to addressing climate change.", "HSK4", "environment"),
    ("绿色生活方式需要从日常小事做起。", "lǜ sè shēng huó fāng shì xū yào cóng rì cháng xiǎo shì zuò qǐ", "Lối sống xanh cần bắt đầu từ những việc nhỏ hàng ngày.", "A green lifestyle starts with small daily actions.", "HSK4", "environment"),
    # HSK5
    ("生态系统的平衡一旦被打破，后果不堪设想。", "shēng tài xì tǒng de píng héng yí dàn bèi dǎ pò, hòu guǒ bù kān shè xiǎng", "Sự cân bằng hệ sinh thái một khi bị phá vỡ, hậu quả khó lường.", "Once the balance of the ecosystem is broken, the consequences are unimaginable.", "HSK5", "environment"),
    ("循环经济模式有助于实现资源的可持续利用。", "xún huán jīng jì mó shì yǒu zhù yú shí xiàn zī yuán de kě chí xù lì yòng", "Mô hình kinh tế tuần hoàn giúp sử dụng tài nguyên bền vững.", "The circular economy model helps achieve sustainable use of resources.", "HSK5", "environment"),
    ("海洋塑料污染已经成为全球性的环境危机。", "hǎi yáng sù liào wū rǎn yǐ jīng chéng wéi quán qiú xìng de huán jìng wēi jī", "Ô nhiễm nhựa đại dương đã trở thành cuộc khủng hoảng môi trường toàn cầu.", "Ocean plastic pollution has become a global environmental crisis.", "HSK5", "environment"),
    # HSK6
    ("生物多样性的丧失将对人类文明的存续构成威胁。", "shēng wù duō yàng xìng de sàng shī jiāng duì rén lèi wén míng de cún xù gòu chéng wēi xié", "Mất đa dạng sinh học sẽ đe dọa sự tồn tại của văn minh nhân loại.", "The loss of biodiversity will threaten the survival of human civilization.", "HSK6", "environment"),
    ("环境治理需要政府、企业和公众的协同参与。", "huán jìng zhì lǐ xū yào zhèng fǔ, qǐ yè hé gōng zhòng de xié tóng cān yǔ", "Quản lý môi trường cần sự tham gia phối hợp của chính phủ, doanh nghiệp và công chúng.", "Environmental governance requires coordinated participation from government, businesses, and the public.", "HSK6", "environment"),

    # ==================== LAW ====================
    # HSK3
    ("每个人都要遵守法律。", "měi gè rén dōu yào zūn shǒu fǎ lǜ", "Mỗi người đều phải tuân thủ pháp luật.", "Everyone must obey the law.", "HSK3", "law"),
    ("闯红灯是违法的。", "chuǎng hóng dēng shì wéi fǎ de", "Vượt đèn đỏ là vi phạm pháp luật.", "Running a red light is illegal.", "HSK3", "law"),
    ("偷东西是犯罪。", "tōu dōng xi shì fàn zuì", "Ăn trộm là phạm tội.", "Stealing is a crime.", "HSK3", "law"),
    ("他被警察罚款了。", "tā bèi jǐng chá fá kuǎn le", "Anh ấy bị cảnh sát phạt tiền.", "He was fined by the police.", "HSK3", "law"),
    ("你有权利请律师。", "nǐ yǒu quán lì qǐng lǜ shī", "Bạn có quyền mời luật sư.", "You have the right to a lawyer.", "HSK3", "law"),
    # HSK4
    ("法律面前人人平等。", "fǎ lǜ miàn qián rén rén píng děng", "Trước pháp luật mọi người đều bình đẳng.", "Everyone is equal before the law.", "HSK4", "law"),
    ("消费者有权要求退货。", "xiāo fèi zhě yǒu quán yāo qiú tuì huò", "Người tiêu dùng có quyền yêu cầu trả hàng.", "Consumers have the right to request returns.", "HSK4", "law"),
    ("合同一旦签订，双方都要遵守。", "hé tong yí dàn qiān dìng, shuāng fāng dōu yào zūn shǒu", "Hợp đồng một khi ký kết, hai bên đều phải tuân thủ.", "Once a contract is signed, both parties must comply.", "HSK4", "law"),
    ("知识产权保护对创新非常重要。", "zhī shi chǎn quán bǎo hù duì chuàng xīn fēi cháng zhòng yào", "Bảo hộ quyền sở hữu trí tuệ rất quan trọng cho đổi mới.", "Intellectual property protection is very important for innovation.", "HSK4", "law"),
    ("个人隐私受法律保护。", "gè rén yǐn sī shòu fǎ lǜ bǎo hù", "Quyền riêng tư cá nhân được pháp luật bảo vệ.", "Personal privacy is protected by law.", "HSK4", "law"),
    ("酒后驾车是严重的违法行为。", "jiǔ hòu jià chē shì yán zhòng de wéi fǎ xíng wéi", "Lái xe sau khi uống rượu là hành vi vi phạm nghiêm trọng.", "Drunk driving is a serious offense.", "HSK4", "law"),
    # HSK5
    ("法治社会要求任何权力都要受到法律的制约。", "fǎ zhì shè huì yāo qiú rèn hé quán lì dōu yào shòu dào fǎ lǜ de zhì yuē", "Xã hội pháp trị yêu cầu mọi quyền lực đều phải bị pháp luật ràng buộc.", "A rule-of-law society requires that all power be constrained by law.", "HSK5", "law"),
    ("数据隐私法规正在全球范围内不断完善。", "shù jù yǐn sī fǎ guī zhèng zài quán qiú fàn wéi nèi bú duàn wán shàn", "Quy định bảo mật dữ liệu đang ngày càng hoàn thiện trên phạm vi toàn cầu.", "Data privacy regulations are being continuously improved worldwide.", "HSK5", "law"),
    ("仲裁是解决商业纠纷的重要法律途径。", "zhòng cái shì jiě jué shāng yè jiū fēn de zhòng yào fǎ lǜ tú jìng", "Trọng tài là con đường pháp lý quan trọng giải quyết tranh chấp thương mại.", "Arbitration is an important legal avenue for resolving commercial disputes.", "HSK5", "law"),
    # HSK6
    ("司法独立是保障公民权利的基石。", "sī fǎ dú lì shì bǎo zhàng gōng mín quán lì de jī shí", "Tư pháp độc lập là nền tảng bảo đảm quyền công dân.", "Judicial independence is the cornerstone of protecting citizens' rights.", "HSK6", "law"),
    ("国际法在解决跨国争端中发挥着不可替代的作用。", "guó jì fǎ zài jiě jué kuà guó zhēng duān zhōng fā huī zhe bù kě tì dài de zuò yòng", "Luật quốc tế đóng vai trò không thể thay thế trong giải quyết tranh chấp xuyên quốc gia.", "International law plays an irreplaceable role in resolving transnational disputes.", "HSK6", "law"),
    ("程序正义与实体正义同样重要。", "chéng xù zhèng yì yǔ shí tǐ zhèng yì tóng yàng zhòng yào", "Công lý thủ tục và công lý thực thể đều quan trọng như nhau.", "Procedural justice is just as important as substantive justice.", "HSK6", "law"),

    # ==================== SOCIETY ====================
    # HSK3
    ("志愿者帮助了很多人。", "zhì yuàn zhě bāng zhù le hěn duō rén", "Tình nguyện viên giúp đỡ nhiều người.", "Volunteers have helped many people.", "HSK3", "society"),
    ("现在年轻人结婚越来越晚。", "xiàn zài nián qīng rén jié hūn yuè lái yuè wǎn", "Giới trẻ bây giờ kết hôn ngày càng muộn.", "Young people are getting married later and later.", "HSK3", "society"),
    ("大城市的生活节奏很快。", "dà chéng shì de shēng huó jié zòu hěn kuài", "Nhịp sống thành phố lớn rất nhanh.", "The pace of life in big cities is very fast.", "HSK3", "society"),
    ("越来越多的老人独自生活。", "yuè lái yuè duō de lǎo rén dú zì shēng huó", "Ngày càng nhiều người già sống một mình.", "More and more elderly people live alone.", "HSK3", "society"),
    ("社区组织了一次环保活动。", "shè qū zǔ zhī le yí cì huán bǎo huó dòng", "Cộng đồng tổ chức một hoạt động bảo vệ môi trường.", "The community organized an environmental event.", "HSK3", "society"),
    # HSK4
    ("城乡差距是社会发展面临的重要问题。", "chéng xiāng chā jù shì shè huì fā zhǎn miàn lín de zhòng yào wèn tí", "Khoảng cách thành thị-nông thôn là vấn đề quan trọng phát triển xã hội phải đối mặt.", "The urban-rural gap is an important issue in social development.", "HSK4", "society"),
    ("教育公平关系到社会的稳定和发展。", "jiào yù gōng píng guān xì dào shè huì de wěn dìng hé fā zhǎn", "Công bằng giáo dục liên quan đến sự ổn định và phát triển xã hội.", "Educational equity is related to social stability and development.", "HSK4", "society"),
    ("老龄化社会带来了养老问题。", "lǎo líng huà shè huì dài lái le yǎng lǎo wèn tí", "Xã hội già hóa mang đến vấn đề dưỡng lão.", "An aging society brings elderly care issues.", "HSK4", "society"),
    ("男女平等是社会进步的标志。", "nán nǚ píng děng shì shè huì jìn bù de biāo zhì", "Bình đẳng nam nữ là dấu hiệu tiến bộ xã hội.", "Gender equality is a sign of social progress.", "HSK4", "society"),
    ("公益慈善事业需要更多人的参与。", "gōng yì cí shàn shì yè xū yào gèng duō rén de cān yù", "Hoạt động từ thiện công ích cần nhiều người tham gia hơn.", "Public welfare and charity need more people's participation.", "HSK4", "society"),
    ("贫富差距扩大是一个全球性问题。", "pín fù chā jù kuò dà shì yí gè quán qiú xìng wèn tí", "Khoảng cách giàu nghèo mở rộng là vấn đề toàn cầu.", "The widening wealth gap is a global issue.", "HSK4", "society"),
    # HSK5
    ("社会治理需要多方协同合作。", "shè huì zhì lǐ xū yào duō fāng xié tóng hé zuò", "Quản trị xã hội cần nhiều bên hợp tác phối hợp.", "Social governance requires multi-party collaboration.", "HSK5", "society"),
    ("人口流动推动了城市化进程。", "rén kǒu liú dòng tuī dòng le chéng shì huà jìn chéng", "Dịch chuyển dân cư thúc đẩy quá trình đô thị hóa.", "Population mobility has driven urbanization.", "HSK5", "society"),
    ("公民社会的成熟是民主发展的重要标志。", "gōng mín shè huì de chéng shú shì mín zhǔ fā zhǎn de zhòng yào biāo zhì", "Sự trưởng thành của xã hội dân sự là dấu hiệu quan trọng của phát triển dân chủ.", "A mature civil society is an important indicator of democratic development.", "HSK5", "society"),
    # HSK6
    ("社会分层固化阻碍了阶层流动和社会活力。", "shè huì fēn céng gù huà zǔ ài le jiē céng liú dòng hé shè huì huó lì", "Cố hóa phân tầng xã hội cản trở luân chuyển giai tầng và sức sống xã hội.", "Rigid social stratification hinders class mobility and social vitality.", "HSK6", "society"),
    ("舆论监督是推动社会公正的重要力量。", "yú lùn jiān dū shì tuī dòng shè huì gōng zhèng de zhòng yào lì liang", "Giám sát dư luận là lực lượng quan trọng thúc đẩy công bằng xã hội.", "Public opinion supervision is an important force for promoting social justice.", "HSK6", "society"),
    ("城市包容性发展要求关注弱势群体的需求。", "chéng shì bāo róng xìng fā zhǎn yāo qiú guān zhù ruò shì qún tǐ de xū qiú", "Phát triển đô thị bao trùm yêu cầu quan tâm nhu cầu nhóm yếu thế.", "Inclusive urban development requires attention to the needs of vulnerable groups.", "HSK6", "society"),

    # ==================== TIME ====================
    # HSK1
    ("现在几点了？", "xiàn zài jǐ diǎn le", "Mấy giờ rồi?", "What time is it now?", "HSK1", "time"),
    ("今天星期几？", "jīn tiān xīng qī jǐ", "Hôm nay thứ mấy?", "What day is it today?", "HSK1", "time"),
    ("明天我有课。", "míng tiān wǒ yǒu kè", "Ngày mai tôi có lớp.", "I have class tomorrow.", "HSK1", "time"),
    ("昨天下雨了。", "zuó tiān xià yǔ le", "Hôm qua trời mưa.", "It rained yesterday.", "HSK1", "time"),
    ("我每天六点起床。", "wǒ měi tiān liù diǎn qǐ chuáng", "Tôi mỗi ngày sáu giờ dậy.", "I wake up at six every day.", "HSK1", "time"),
    ("下午我有时间。", "xià wǔ wǒ yǒu shí jiān", "Chiều tôi có thời gian.", "I have time in the afternoon.", "HSK1", "time"),
    # HSK2
    ("上个星期我去了北京。", "shàng gè xīng qī wǒ qù le běi jīng", "Tuần trước tôi đã đi Bắc Kinh.", "I went to Beijing last week.", "HSK2", "time"),
    ("下个月是春节。", "xià gè yuè shì chūn jié", "Tháng sau là Tết.", "Next month is Spring Festival.", "HSK2", "time"),
    ("时间过得真快。", "shí jiān guò de zhēn kuài", "Thời gian trôi thật nhanh.", "Time flies so fast.", "HSK2", "time"),
    ("等一下。", "děng yí xià", "Đợi một chút.", "Wait a moment.", "HSK2", "time"),
    ("已经很晚了。", "yǐ jīng hěn wǎn le", "Đã rất muộn rồi.", "It's already very late.", "HSK2", "time"),
    ("你什么时候有空？", "nǐ shén me shí hou yǒu kòng", "Khi nào bạn rảnh?", "When are you free?", "HSK2", "time"),
    # HSK3
    ("请提前十分钟到。", "qǐng tí qián shí fēn zhōng dào", "Xin đến trước mười phút.", "Please arrive ten minutes early.", "HSK3", "time"),
    ("这件事我需要考虑一段时间。", "zhè jiàn shì wǒ xū yào kǎo lǜ yí duàn shí jiān", "Việc này tôi cần suy nghĩ một thời gian.", "I need some time to think about this.", "HSK3", "time"),
    ("他总是准时到达。", "tā zǒng shì zhǔn shí dào dá", "Anh ấy luôn đến đúng giờ.", "He always arrives on time.", "HSK3", "time"),
    ("学期快要结束了。", "xué qī kuài yào jié shù le", "Học kỳ sắp kết thúc rồi.", "The semester is about to end.", "HSK3", "time"),
    ("这项工作的截止日期是下周五。", "zhè xiàng gōng zuò de jié zhǐ rì qī shì xià zhōu wǔ", "Hạn chót công việc này là thứ Sáu tuần sau.", "The deadline for this work is next Friday.", "HSK3", "time"),
    # HSK4
    ("合理安排时间是成功的关键。", "hé lǐ ān pái shí jiān shì chéng gōng de guān jiàn", "Sắp xếp thời gian hợp lý là chìa khóa thành công.", "Proper time management is the key to success.", "HSK4", "time"),
    ("珍惜当下比回忆过去更重要。", "zhēn xī dāng xià bǐ huí yì guò qù gèng zhòng yào", "Trân trọng hiện tại quan trọng hơn nhớ về quá khứ.", "Cherishing the present is more important than reminiscing about the past.", "HSK4", "time"),
    ("这个世纪最大的变化是科技的飞速发展。", "zhè ge shì jì zuì dà de biàn huà shì kē jì de fēi sù fā zhǎn", "Thay đổi lớn nhất thế kỷ này là sự phát triển nhanh chóng của khoa học công nghệ.", "The biggest change this century is the rapid development of technology.", "HSK4", "time"),
    # HSK5
    ("历史的经验教训值得我们深刻反思。", "lì shǐ de jīng yàn jiào xun zhí de wǒ men shēn kè fǎn sī", "Bài học kinh nghiệm lịch sử đáng để chúng ta suy ngẫm sâu sắc.", "Historical lessons are worth our deep reflection.", "HSK5", "time"),
    ("时代在变迁，观念也要与时俱进。", "shí dài zài biàn qiān, guān niàn yě yào yǔ shí jù jìn", "Thời đại thay đổi, quan niệm cũng phải tiến theo thời đại.", "As times change, ideas must also keep pace.", "HSK5", "time"),
    # HSK6
    ("时间管理的本质是对生命价值的管理。", "shí jiān guǎn lǐ de běn zhì shì duì shēng mìng jià zhí de guǎn lǐ", "Bản chất quản lý thời gian là quản lý giá trị cuộc sống.", "The essence of time management is managing life's value.", "HSK6", "time"),

    # ==================== DAILY ====================
    # HSK1
    ("我在看电视。", "wǒ zài kàn diàn shì", "Tôi đang xem tivi.", "I'm watching TV.", "HSK1", "daily"),
    ("我想睡觉了。", "wǒ xiǎng shuì jiào le", "Tôi muốn ngủ rồi.", "I want to sleep.", "HSK1", "daily"),
    ("他在打电话。", "tā zài dǎ diàn huà", "Anh ấy đang gọi điện.", "He's making a phone call.", "HSK1", "daily"),
    ("我在洗衣服。", "wǒ zài xǐ yī fu", "Tôi đang giặt quần áo.", "I'm doing laundry.", "HSK1", "daily"),
    ("今天我很忙。", "jīn tiān wǒ hěn máng", "Hôm nay tôi rất bận.", "I'm very busy today.", "HSK1", "daily"),
    # HSK2
    ("周末我喜欢看电影。", "zhōu mò wǒ xǐ huan kàn diàn yǐng", "Cuối tuần tôi thích xem phim.", "I like watching movies on weekends.", "HSK2", "daily"),
    ("每天早上我去跑步。", "měi tiān zǎo shang wǒ qù pǎo bù", "Mỗi sáng tôi đi chạy bộ.", "I go jogging every morning.", "HSK2", "daily"),
    ("我在听音乐。", "wǒ zài tīng yīn yuè", "Tôi đang nghe nhạc.", "I'm listening to music.", "HSK2", "daily"),
    ("晚饭后我们去散步。", "wǎn fàn hòu wǒ men qù sàn bù", "Sau bữa tối chúng tôi đi dạo.", "We go for a walk after dinner.", "HSK2", "daily"),
    ("我正在打扫房间。", "wǒ zhèng zài dǎ sǎo fáng jiān", "Tôi đang dọn phòng.", "I'm cleaning my room.", "HSK2", "daily"),
    # HSK3
    ("我养了一只猫和一只狗。", "wǒ yǎng le yì zhī māo hé yì zhī gǒu", "Tôi nuôi một con mèo và một con chó.", "I have a cat and a dog.", "HSK3", "daily"),
    ("周末我喜欢去公园散步。", "zhōu mò wǒ xǐ huan qù gōng yuán sàn bù", "Cuối tuần tôi thích đi dạo công viên.", "I like walking in the park on weekends.", "HSK3", "daily"),
    ("我经常在家做饭。", "wǒ jīng cháng zài jiā zuò fàn", "Tôi thường nấu ăn ở nhà.", "I often cook at home.", "HSK3", "daily"),
    ("她每天都化妆。", "tā měi tiān dōu huà zhuāng", "Cô ấy ngày nào cũng trang điểm.", "She puts on makeup every day.", "HSK3", "daily"),
    ("我一般十一点睡觉。", "wǒ yì bān shí yī diǎn shuì jiào", "Tôi thường mười một giờ đi ngủ.", "I usually go to bed at eleven.", "HSK3", "daily"),
    # HSK4
    ("生活节奏越来越快，人们的压力也越来越大。", "shēng huó jié zòu yuè lái yuè kuài, rén men de yā lì yě yuè lái yuè dà", "Nhịp sống ngày càng nhanh, áp lực con người cũng ngày càng lớn.", "As the pace of life gets faster, people's stress also increases.", "HSK4", "daily"),
    ("减少屏幕时间有益于身心健康。", "jiǎn shǎo píng mù shí jiān yǒu yì yú shēn xīn jiàn kāng", "Giảm thời gian nhìn màn hình có ích cho sức khỏe thể chất và tinh thần.", "Reducing screen time is beneficial for physical and mental health.", "HSK4", "daily"),
    ("规律的作息时间对健康很重要。", "guī lǜ de zuò xī shí jiān duì jiàn kāng hěn zhòng yào", "Giờ giấc sinh hoạt đều đặn rất quan trọng cho sức khỏe.", "A regular schedule is very important for health.", "HSK4", "daily"),
    # HSK5
    ("快节奏的都市生活使人们越来越渴望回归自然。", "kuài jié zòu de dū shì shēng huó shǐ rén men yuè lái yuè kě wàng huí guī zì rán", "Cuộc sống đô thị nhịp nhanh khiến người ta ngày càng khao khát trở về thiên nhiên.", "The fast-paced urban life makes people increasingly yearn to return to nature.", "HSK5", "daily"),
    ("断舍离的生活理念提倡简约而有质量的生活。", "duàn shě lí de shēng huó lǐ niàn tí chàng jiǎn yuē ér yǒu zhì liàng de shēng huó", "Triết lý sống tối giản đề cao cuộc sống giản đơn nhưng chất lượng.", "The minimalist lifestyle advocates for simple yet quality living.", "HSK5", "daily"),
    # HSK6
    ("现代人的精神空虚往往源于物质追求与精神需求的失衡。", "xiàn dài rén de jīng shén kōng xū wǎng wǎng yuán yú wù zhì zhuī qiú yǔ jīng shén xū qiú de shī héng", "Sự trống rỗng tinh thần con người hiện đại thường bắt nguồn từ mất cân bằng giữa vật chất và tinh thần.", "Modern people's spiritual emptiness often stems from the imbalance between material pursuits and spiritual needs.", "HSK6", "daily"),
]


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(script_dir, "chinese_phrases.json")
    output_path = os.path.join(script_dir, "chinese_phrases.json")

    # Read existing data
    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    existing_phrases = data.get("phrases", [])
    print(f"Existing phrases: {len(existing_phrases)}")

    # Build set of existing zh strings to avoid duplicates
    existing_zh = set()
    for p in existing_phrases:
        existing_zh.add(p["zh"].strip())

    # Find max existing ID
    max_id = 0
    for p in existing_phrases:
        pid = p.get("id", "cp_000000")
        try:
            num = int(pid.split("_")[1])
            if num > max_id:
                max_id = num
        except (IndexError, ValueError):
            pass

    # Convert new phrases to proper format
    new_count = 0
    hsk_map = {"HSK1": 1, "HSK2": 2, "HSK3": 3, "HSK4": 4, "HSK5": 5, "HSK6": 6}

    for zh, pinyin, vi, en, level, category in NEW_PHRASES:
        zh_clean = zh.strip()
        if zh_clean in existing_zh:
            continue  # Skip duplicates

        max_id += 1
        new_phrase = {
            "id": f"cp_{max_id:06d}",
            "zh": zh_clean,
            "vi": vi.strip(),
            "en": en.strip(),
            "pinyin": pinyin.strip(),
            "level": level,
            "category": category,
            "directions": ["zh-to-vi", "vi-to-zh"],
            "hskLevel": hsk_map.get(level, 1)
        }
        existing_phrases.append(new_phrase)
        existing_zh.add(zh_clean)
        new_count += 1

    print(f"Added {new_count} new phrases")
    print(f"Total phrases: {len(existing_phrases)}")

    # Update metadata
    data["meta"] = {
        "source": "Merged: legacy + Tatoeba API (cmn-vie) + comprehensive HSK1-6 expansion",
        "totalPhrases": len(existing_phrases),
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00"),
        "rebalanced": True,
        "rebalanceNote": "HSK levels and categories normalized and expanded with comprehensive dataset"
    }
    data["phrases"] = existing_phrases

    # Write output
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\nSaved to: {output_path}")

    # Print distribution
    from collections import Counter
    level_counts = Counter()
    cat_counts = Counter()
    for p in existing_phrases:
        level_counts[p.get("level", "?")] += 1
        cat_counts[p.get("category", "?")] += 1

    print("\n=== Distribution by HSK Level ===")
    for level in sorted(level_counts.keys()):
        print(f"  {level}: {level_counts[level]}")

    print("\n=== Distribution by Category ===")
    for cat in sorted(cat_counts.keys(), key=lambda x: -cat_counts[x]):
        print(f"  {cat}: {cat_counts[cat]}")


if __name__ == "__main__":
    main()
