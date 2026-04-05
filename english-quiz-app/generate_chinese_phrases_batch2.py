#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Batch 2: Focus on severely underrepresented categories.
Target: business, finance, environment, law, society, transport, culture, technology
"""
import json
import os
from datetime import datetime, timezone
from collections import Counter

NEW_PHRASES = [
    # ==================== BUSINESS (more) ====================
    # HSK1
    ("他是老板。", "tā shì lǎo bǎn", "Anh ấy là sếp.", "He is the boss.", "HSK1", "business"),
    ("这家店很大。", "zhè jiā diàn hěn dà", "Cửa hàng này rất lớn.", "This store is very big.", "HSK1", "business"),
    ("我去买东西。", "wǒ qù mǎi dōng xi", "Tôi đi mua đồ.", "I'm going to buy things.", "HSK1", "business"),
    ("这个东西很贵。", "zhè ge dōng xi hěn guì", "Cái này rất đắt.", "This thing is expensive.", "HSK1", "business"),
    # HSK2
    ("他在公司开会。", "tā zài gōng sī kāi huì", "Anh ấy đang họp ở công ty.", "He's having a meeting at the company.", "HSK2", "business"),
    ("这个产品很好。", "zhè ge chǎn pǐn hěn hǎo", "Sản phẩm này rất tốt.", "This product is very good.", "HSK2", "business"),
    ("生意越来越好了。", "shēng yi yuè lái yuè hǎo le", "Kinh doanh ngày càng tốt rồi.", "Business is getting better and better.", "HSK2", "business"),
    ("我们的客户很多。", "wǒ men de kè hù hěn duō", "Khách hàng của chúng tôi rất nhiều.", "We have many customers.", "HSK2", "business"),
    ("经理正在忙。", "jīng lǐ zhèng zài máng", "Quản lý đang bận.", "The manager is busy.", "HSK2", "business"),
    ("公司搬家了。", "gōng sī bān jiā le", "Công ty chuyển địa điểm rồi.", "The company has relocated.", "HSK2", "business"),
    # HSK3
    ("我们需要一份详细的报价单。", "wǒ men xū yào yí fèn xiáng xì de bào jià dān", "Chúng tôi cần một bảng báo giá chi tiết.", "We need a detailed quotation.", "HSK3", "business"),
    ("这个品牌在中国很有名。", "zhè ge pǐn pái zài zhōng guó hěn yǒu míng", "Thương hiệu này ở Trung Quốc rất nổi tiếng.", "This brand is very famous in China.", "HSK3", "business"),
    ("公司的利润今年增长了百分之二十。", "gōng sī de lì rùn jīn nián zēng zhǎng le bǎi fēn zhī èr shí", "Lợi nhuận công ty năm nay tăng 20%.", "The company's profit grew by 20% this year.", "HSK3", "business"),
    ("竞争对手的价格比我们低。", "jìng zhēng duì shǒu de jià gé bǐ wǒ men dī", "Giá đối thủ cạnh tranh thấp hơn chúng tôi.", "The competitor's prices are lower than ours.", "HSK3", "business"),
    ("我们打算扩大生产规模。", "wǒ men dǎ suàn kuò dà shēng chǎn guī mó", "Chúng tôi dự định mở rộng quy mô sản xuất.", "We plan to expand production scale.", "HSK3", "business"),
    ("广告对销售有很大帮助。", "guǎng gào duì xiāo shòu yǒu hěn dà bāng zhù", "Quảng cáo giúp ích rất lớn cho bán hàng.", "Advertising is very helpful for sales.", "HSK3", "business"),
    ("这份合作协议对双方都有好处。", "zhè fèn hé zuò xié yì duì shuāng fāng dōu yǒu hǎo chu", "Thỏa thuận hợp tác này có lợi cho cả hai bên.", "This cooperation agreement benefits both parties.", "HSK3", "business"),
    # HSK4
    ("企业应该注重社会责任。", "qǐ yè yīng gāi zhù zhòng shè huì zé rèn", "Doanh nghiệp nên chú trọng trách nhiệm xã hội.", "Enterprises should pay attention to social responsibility.", "HSK4", "business"),
    ("跨国公司面临文化差异的挑战。", "kuà guó gōng sī miàn lín wén huà chā yì de tiǎo zhàn", "Công ty đa quốc gia đối mặt thách thức khác biệt văn hóa.", "Multinational companies face challenges of cultural differences.", "HSK4", "business"),
    ("市场营销策略需要根据目标客户来制定。", "shì chǎng yíng xiāo cè lüè xū yào gēn jù mù biāo kè hù lái zhì dìng", "Chiến lược marketing cần được xây dựng dựa trên khách hàng mục tiêu.", "Marketing strategies need to be developed based on target customers.", "HSK4", "business"),
    ("创业初期面临着资金不足的困难。", "chuàng yè chū qī miàn lín zhe zī jīn bù zú de kùn nan", "Giai đoạn đầu khởi nghiệp đối mặt khó khăn thiếu vốn.", "The early stage of entrepreneurship faces the difficulty of insufficient funds.", "HSK4", "business"),
    ("电子商务改变了传统的商业模式。", "diàn zǐ shāng wù gǎi biàn le chuán tǒng de shāng yè mó shì", "Thương mại điện tử thay đổi mô hình kinh doanh truyền thống.", "E-commerce has changed traditional business models.", "HSK4", "business"),
    ("售后服务是提高客户满意度的关键。", "shòu hòu fú wù shì tí gāo kè hù mǎn yì dù de guān jiàn", "Dịch vụ hậu mãi là chìa khóa nâng cao sự hài lòng khách hàng.", "After-sales service is key to improving customer satisfaction.", "HSK4", "business"),
    ("年度报告显示公司的业绩稳步增长。", "nián dù bào gào xiǎn shì gōng sī de yè jì wěn bù zēng zhǎng", "Báo cáo thường niên cho thấy hiệu quả kinh doanh tăng trưởng ổn định.", "The annual report shows steady growth in company performance.", "HSK4", "business"),
    # HSK5
    ("并购是企业快速扩张的有效途径。", "bìng gòu shì qǐ yè kuài sù kuò zhāng de yǒu xiào tú jìng", "Sáp nhập và mua lại là con đường hiệu quả để doanh nghiệp mở rộng nhanh.", "Mergers and acquisitions are an effective way for enterprises to expand rapidly.", "HSK5", "business"),
    ("商业伦理应该贯穿企业经营的全过程。", "shāng yè lún lǐ yīng gāi guàn chuān qǐ yè jīng yíng de quán guò chéng", "Đạo đức kinh doanh nên xuyên suốt toàn bộ quá trình hoạt động doanh nghiệp.", "Business ethics should run through the entire business operation process.", "HSK5", "business"),
    ("产业链整合有助于提高企业的竞争优势。", "chǎn yè liàn zhěng hé yǒu zhù yú tí gāo qǐ yè de jìng zhēng yōu shì", "Tích hợp chuỗi công nghiệp giúp nâng cao lợi thế cạnh tranh doanh nghiệp.", "Industry chain integration helps improve enterprise competitiveness.", "HSK5", "business"),
    ("品牌定位决定了企业的市场竞争策略。", "pǐn pái dìng wèi jué dìng le qǐ yè de shì chǎng jìng zhēng cè lüè", "Định vị thương hiệu quyết định chiến lược cạnh tranh thị trường.", "Brand positioning determines the market competition strategy.", "HSK5", "business"),
    # HSK6
    ("企业治理结构的优化是提升公司价值的根本。", "qǐ yè zhì lǐ jié gòu de yōu huà shì tí shēng gōng sī jià zhí de gēn běn", "Tối ưu cấu trúc quản trị doanh nghiệp là nền tảng nâng cao giá trị công ty.", "Optimizing corporate governance structure is fundamental to enhancing company value.", "HSK6", "business"),
    ("反垄断法的实施旨在维护市场公平竞争秩序。", "fǎn lǒng duàn fǎ de shí shī zhǐ zài wéi hù shì chǎng gōng píng jìng zhēng zhì xù", "Thực thi luật chống độc quyền nhằm duy trì trật tự cạnh tranh công bằng thị trường.", "The implementation of antitrust law aims to maintain fair market competition.", "HSK6", "business"),

    # ==================== FINANCE (more) ====================
    # HSK1
    ("我有钱。", "wǒ yǒu qián", "Tôi có tiền.", "I have money.", "HSK1", "finance"),
    ("这个太贵了。", "zhè ge tài guì le", "Cái này đắt quá.", "This is too expensive.", "HSK1", "finance"),
    ("多少钱？", "duō shǎo qián", "Bao nhiêu tiền?", "How much money?", "HSK1", "finance"),
    # HSK2
    ("我每个月存一千块钱。", "wǒ měi gè yuè cún yì qiān kuài qián", "Tôi mỗi tháng tiết kiệm một ngàn tệ.", "I save a thousand yuan every month.", "HSK2", "finance"),
    ("他借了我一百块。", "tā jiè le wǒ yì bǎi kuài", "Anh ấy mượn tôi một trăm tệ.", "He borrowed a hundred yuan from me.", "HSK2", "finance"),
    ("这个月的工资还没发。", "zhè ge yuè de gōng zī hái méi fā", "Lương tháng này chưa phát.", "This month's salary hasn't been paid yet.", "HSK2", "finance"),
    ("银行几点开门？", "yín háng jǐ diǎn kāi mén", "Ngân hàng mấy giờ mở cửa?", "What time does the bank open?", "HSK2", "finance"),
    # HSK3
    ("我想办一张信用卡。", "wǒ xiǎng bàn yì zhāng xìn yòng kǎ", "Tôi muốn làm một thẻ tín dụng.", "I want to apply for a credit card.", "HSK3", "finance"),
    ("今年的物价涨了不少。", "jīn nián de wù jià zhǎng le bù shǎo", "Giá cả năm nay tăng không ít.", "Prices have risen quite a bit this year.", "HSK3", "finance"),
    ("网上转账比去银行方便。", "wǎng shàng zhuǎn zhàng bǐ qù yín háng fāng biàn", "Chuyển khoản online tiện hơn đi ngân hàng.", "Online transfers are more convenient than going to the bank.", "HSK3", "finance"),
    ("ATM机在哪里？", "ATM jī zài nǎ lǐ", "Máy ATM ở đâu?", "Where is the ATM?", "HSK3", "finance"),
    ("手续费是多少？", "shǒu xù fèi shì duō shǎo", "Phí thủ tục là bao nhiêu?", "What is the handling fee?", "HSK3", "finance"),
    ("我需要一份银行流水。", "wǒ xū yào yí fèn yín háng liú shuǐ", "Tôi cần một bản sao kê ngân hàng.", "I need a bank statement.", "HSK3", "finance"),
    # HSK4
    ("年轻人应该尽早开始理财规划。", "nián qīng rén yīng gāi jǐn zǎo kāi shǐ lǐ cái guī huà", "Giới trẻ nên bắt đầu kế hoạch tài chính sớm.", "Young people should start financial planning as soon as possible.", "HSK4", "finance"),
    ("基金和股票各有优缺点。", "jī jīn hé gǔ piào gè yǒu yōu quē diǎn", "Quỹ và cổ phiếu đều có ưu nhược điểm.", "Funds and stocks each have their advantages and disadvantages.", "HSK4", "finance"),
    ("房贷占了他收入的一半。", "fáng dài zhàn le tā shōu rù de yí bàn", "Tiền vay nhà chiếm một nửa thu nhập anh ấy.", "The mortgage takes up half of his income.", "HSK4", "finance"),
    ("税收制度改革影响了每个人的收入。", "shuì shōu zhì dù gǎi gé yǐng xiǎng le měi gè rén de shōu rù", "Cải cách chế độ thuế ảnh hưởng đến thu nhập mỗi người.", "Tax system reform has affected everyone's income.", "HSK4", "finance"),
    ("经济增长放缓影响了就业市场。", "jīng jì zēng zhǎng fàng huǎn yǐng xiǎng le jiù yè shì chǎng", "Tăng trưởng kinh tế chậm lại ảnh hưởng thị trường việc làm.", "Economic slowdown has affected the job market.", "HSK4", "finance"),
    ("消费贷款要谨慎使用。", "xiāo fèi dài kuǎn yào jǐn shèn shǐ yòng", "Vay tiêu dùng phải sử dụng thận trọng.", "Consumer loans should be used cautiously.", "HSK4", "finance"),
    # HSK5
    ("养老金体系改革迫在眉睫。", "yǎng lǎo jīn tǐ xì gǎi gé pò zài méi jié", "Cải cách hệ thống lương hưu cấp bách.", "Pension system reform is urgently needed.", "HSK5", "finance"),
    ("绿色金融支持可持续发展项目。", "lǜ sè jīn róng zhī chí kě chí xù fā zhǎn xiàng mù", "Tài chính xanh hỗ trợ các dự án phát triển bền vững.", "Green finance supports sustainable development projects.", "HSK5", "finance"),
    ("普惠金融旨在让更多人获得金融服务。", "pǔ huì jīn róng zhǐ zài ràng gèng duō rén huò dé jīn róng fú wù", "Tài chính toàn diện nhằm giúp nhiều người tiếp cận dịch vụ tài chính.", "Inclusive finance aims to give more people access to financial services.", "HSK5", "finance"),
    # HSK6
    ("货币政策的传导机制对宏观经济调控至关重要。", "huò bì zhèng cè de chuán dǎo jī zhì duì hóng guān jīng jì tiáo kòng zhì guān zhòng yào", "Cơ chế truyền dẫn chính sách tiền tệ rất quan trọng cho điều tiết kinh tế vĩ mô.", "The transmission mechanism of monetary policy is crucial for macroeconomic regulation.", "HSK6", "finance"),
    ("资本市场的开放程度反映了一个国家的经济自信。", "zī běn shì chǎng de kāi fàng chéng dù fǎn yìng le yí gè guó jiā de jīng jì zì xìn", "Mức độ mở cửa thị trường vốn phản ánh sự tự tin kinh tế quốc gia.", "The openness of capital markets reflects a country's economic confidence.", "HSK6", "finance"),

    # ==================== ENVIRONMENT (more) ====================
    # HSK1
    ("花很好看。", "huā hěn hǎo kàn", "Hoa rất đẹp.", "The flowers are beautiful.", "HSK1", "environment"),
    ("水很干净。", "shuǐ hěn gān jìng", "Nước rất sạch.", "The water is very clean.", "HSK1", "environment"),
    ("树很高。", "shù hěn gāo", "Cây rất cao.", "The tree is very tall.", "HSK1", "environment"),
    # HSK2
    ("公园里有很多树。", "gōng yuán lǐ yǒu hěn duō shù", "Trong công viên có rất nhiều cây.", "There are many trees in the park.", "HSK2", "environment"),
    ("这条河很长。", "zhè tiáo hé hěn cháng", "Con sông này rất dài.", "This river is very long.", "HSK2", "environment"),
    ("动物园里有很多动物。", "dòng wù yuán lǐ yǒu hěn duō dòng wù", "Trong sở thú có rất nhiều động vật.", "There are many animals in the zoo.", "HSK2", "environment"),
    ("海边的空气很好。", "hǎi biān de kōng qì hěn hǎo", "Không khí bên biển rất tốt.", "The air by the sea is very good.", "HSK2", "environment"),
    # HSK3
    ("工厂排放的废水污染了河流。", "gōng chǎng pái fàng de fèi shuǐ wū rǎn le hé liú", "Nước thải nhà máy xả ra ô nhiễm sông.", "Factory wastewater has polluted the rivers.", "HSK3", "environment"),
    ("越来越多的人开始关注环保。", "yuè lái yuè duō de rén kāi shǐ guān zhù huán bǎo", "Ngày càng nhiều người bắt đầu quan tâm bảo vệ môi trường.", "More and more people are starting to care about the environment.", "HSK3", "environment"),
    ("北京的雾霾很严重。", "běi jīng de wù mái hěn yán zhòng", "Sương mù ô nhiễm ở Bắc Kinh rất nghiêm trọng.", "The smog in Beijing is very severe.", "HSK3", "environment"),
    ("新能源可以减少污染。", "xīn néng yuán kě yǐ jiǎn shǎo wū rǎn", "Năng lượng mới có thể giảm ô nhiễm.", "New energy can reduce pollution.", "HSK3", "environment"),
    ("这个地方以前有很多森林。", "zhè ge dì fang yǐ qián yǒu hěn duō sēn lín", "Nơi này trước kia có rất nhiều rừng.", "This place used to have a lot of forests.", "HSK3", "environment"),
    ("节约用电也是保护环境。", "jié yuē yòng diàn yě shì bǎo hù huán jìng", "Tiết kiệm điện cũng là bảo vệ môi trường.", "Saving electricity is also protecting the environment.", "HSK3", "environment"),
    # HSK4
    ("森林是地球的肺，我们必须保护它。", "sēn lín shì dì qiú de fèi, wǒ men bì xū bǎo hù tā", "Rừng là lá phổi của trái đất, chúng ta phải bảo vệ nó.", "Forests are the lungs of the earth; we must protect them.", "HSK4", "environment"),
    ("垃圾回收利用可以减少资源浪费。", "lā jī huí shōu lì yòng kě yǐ jiǎn shǎo zī yuán làng fèi", "Tái chế rác giảm lãng phí tài nguyên.", "Recycling waste can reduce resource waste.", "HSK4", "environment"),
    ("空气质量指数影响人们的日常出行。", "kōng qì zhì liàng zhǐ shù yǐng xiǎng rén men de rì cháng chū xíng", "Chỉ số chất lượng không khí ảnh hưởng đến di chuyển hàng ngày.", "Air quality index affects people's daily travel.", "HSK4", "environment"),
    ("水土流失是造成洪涝灾害的重要原因。", "shuǐ tǔ liú shī shì zào chéng hóng lào zāi hài de zhòng yào yuán yīn", "Xói mòn đất là nguyên nhân quan trọng gây lũ lụt.", "Soil erosion is an important cause of floods.", "HSK4", "environment"),
    ("限塑令的实施有效减少了塑料垃圾。", "xiàn sù lìng de shí shī yǒu xiào jiǎn shǎo le sù liào lā jī", "Lệnh hạn chế nhựa hiệu quả giảm rác nhựa.", "The plastic restriction order has effectively reduced plastic waste.", "HSK4", "environment"),
    # HSK5
    ("碳交易市场的建立为减排提供了经济激励。", "tàn jiāo yì shì chǎng de jiàn lì wèi jiǎn pái tí gōng le jīng jì jī lì", "Xây dựng thị trường giao dịch carbon tạo động lực kinh tế cho giảm phát thải.", "The establishment of carbon trading markets provides economic incentives for emission reduction.", "HSK5", "environment"),
    ("湿地保护对维护生态多样性至关重要。", "shī dì bǎo hù duì wéi hù shēng tài duō yàng xìng zhì guān zhòng yào", "Bảo vệ đất ngập nước rất quan trọng cho duy trì đa dạng sinh thái.", "Wetland protection is crucial for maintaining ecological diversity.", "HSK5", "environment"),
    ("城市热岛效应加剧了夏季高温问题。", "chéng shì rè dǎo xiào yìng jiā jù le xià jì gāo wēn wèn tí", "Hiệu ứng đảo nhiệt đô thị làm trầm trọng thêm vấn đề nóng mùa hè.", "The urban heat island effect worsens summer heat problems.", "HSK5", "environment"),
    # HSK6
    ("生态文明建设是实现人与自然和谐共生的必由之路。", "shēng tài wén míng jiàn shè shì shí xiàn rén yǔ zì rán hé xié gòng shēng de bì yóu zhī lù", "Xây dựng văn minh sinh thái là con đường tất yếu để con người và thiên nhiên cùng tồn tại hài hòa.", "Building ecological civilization is the necessary path for harmonious coexistence between humans and nature.", "HSK6", "environment"),
    ("荒漠化治理需要综合运用多种技术手段。", "huāng mò huà zhì lǐ xū yào zōng hé yùn yòng duō zhǒng jì shù shǒu duàn", "Quản lý sa mạc hóa cần kết hợp nhiều biện pháp kỹ thuật.", "Combating desertification requires the comprehensive use of multiple technical measures.", "HSK6", "environment"),

    # ==================== LAW (more) ====================
    # HSK1
    ("警察在那边。", "jǐng chá zài nà biān", "Cảnh sát ở đằng kia.", "The police are over there.", "HSK1", "law"),
    ("不可以！", "bù kě yǐ", "Không được!", "You can't do that!", "HSK1", "law"),
    # HSK2
    ("请遵守交通规则。", "qǐng zūn shǒu jiāo tōng guī zé", "Xin tuân thủ luật giao thông.", "Please follow traffic rules.", "HSK2", "law"),
    ("这是不允许的。", "zhè shì bù yǔn xǔ de", "Điều này không được phép.", "This is not allowed.", "HSK2", "law"),
    ("你不能在这里停车。", "nǐ bù néng zài zhè lǐ tíng chē", "Bạn không thể đỗ xe ở đây.", "You can't park here.", "HSK2", "law"),
    ("请出示你的证件。", "qǐng chū shì nǐ de zhèng jiàn", "Xin xuất trình giấy tờ.", "Please show your ID.", "HSK2", "law"),
    # HSK3
    ("租房要签合同。", "zū fáng yào qiān hé tong", "Thuê nhà phải ký hợp đồng.", "You need to sign a contract to rent.", "HSK3", "law"),
    ("未成年人不能买烟。", "wèi chéng nián rén bù néng mǎi yān", "Người chưa thành niên không được mua thuốc lá.", "Minors cannot buy cigarettes.", "HSK3", "law"),
    ("侵犯他人权利要承担法律责任。", "qīn fàn tā rén quán lì yào chéng dān fǎ lǜ zé rèn", "Xâm phạm quyền lợi người khác phải chịu trách nhiệm pháp luật.", "Infringing on others' rights requires legal responsibility.", "HSK3", "law"),
    ("买卖假货是违法的。", "mǎi mài jiǎ huò shì wéi fǎ de", "Mua bán hàng giả là vi phạm pháp luật.", "Buying and selling counterfeit goods is illegal.", "HSK3", "law"),
    ("报警电话是110。", "bào jǐng diàn huà shì yāo yāo líng", "Số điện thoại báo cảnh sát là 110.", "The police emergency number is 110.", "HSK3", "law"),
    # HSK4
    ("劳动者有权拒绝不合理的加班要求。", "láo dòng zhě yǒu quán jù jué bù hé lǐ de jiā bān yāo qiú", "Người lao động có quyền từ chối yêu cầu tăng ca không hợp lý.", "Workers have the right to refuse unreasonable overtime demands.", "HSK4", "law"),
    ("网络诈骗的受害者应该及时报案。", "wǎng luò zhà piàn de shòu hài zhě yīng gāi jí shí bào àn", "Nạn nhân lừa đảo mạng nên trình báo kịp thời.", "Victims of online fraud should report to the police promptly.", "HSK4", "law"),
    ("环境污染的责任人要承担赔偿义务。", "huán jìng wū rǎn de zé rèn rén yào chéng dān péi cháng yì wù", "Người gây ô nhiễm môi trường phải chịu nghĩa vụ bồi thường.", "Those responsible for pollution must bear compensation obligations.", "HSK4", "law"),
    ("遗产继承要按照法律规定来办理。", "yí chǎn jì chéng yào àn zhào fǎ lǜ guī dìng lái bàn lǐ", "Thừa kế di sản phải xử lý theo quy định pháp luật.", "Inheritance must be handled according to legal regulations.", "HSK4", "law"),
    # HSK5
    ("人工智能的发展带来了新的法律挑战。", "rén gōng zhì néng de fā zhǎn dài lái le xīn de fǎ lǜ tiǎo zhàn", "Sự phát triển AI mang đến thách thức pháp lý mới.", "The development of AI brings new legal challenges.", "HSK5", "law"),
    ("跨境犯罪需要国际司法合作来打击。", "kuà jìng fàn zuì xū yào guó jì sī fǎ hé zuò lái dǎ jī", "Tội phạm xuyên biên giới cần hợp tác tư pháp quốc tế để trấn áp.", "Cross-border crime requires international judicial cooperation to combat.", "HSK5", "law"),
    ("反腐败立法是建设廉洁政府的重要保障。", "fǎn fǔ bài lì fǎ shì jiàn shè lián jié zhèng fǔ de zhòng yào bǎo zhàng", "Lập pháp chống tham nhũng là bảo đảm quan trọng xây dựng chính phủ liêm chính.", "Anti-corruption legislation is an important guarantee for building a clean government.", "HSK5", "law"),
    # HSK6
    ("宪法是国家的根本大法，具有最高法律效力。", "xiàn fǎ shì guó jiā de gēn běn dà fǎ, jù yǒu zuì gāo fǎ lǜ xiào lì", "Hiến pháp là luật cơ bản quốc gia, có hiệu lực pháp luật cao nhất.", "The constitution is the fundamental law of the state with the highest legal authority.", "HSK6", "law"),
    ("法律的生命力在于实施，权威也在于实施。", "fǎ lǜ de shēng mìng lì zài yú shí shī, quán wēi yě zài yú shí shī", "Sức sống của pháp luật nằm ở thực thi, uy quyền cũng nằm ở thực thi.", "The vitality of law lies in its implementation, and its authority also lies in implementation.", "HSK6", "law"),

    # ==================== SOCIETY (more) ====================
    # HSK1
    ("人很多。", "rén hěn duō", "Người rất đông.", "There are many people.", "HSK1", "society"),
    ("大家都在这里。", "dà jiā dōu zài zhè lǐ", "Mọi người đều ở đây.", "Everyone is here.", "HSK1", "society"),
    # HSK2
    ("他帮助了很多人。", "tā bāng zhù le hěn duō rén", "Anh ấy giúp đỡ nhiều người.", "He helped many people.", "HSK2", "society"),
    ("大家应该互相帮助。", "dà jiā yīng gāi hù xiāng bāng zhù", "Mọi người nên giúp đỡ lẫn nhau.", "Everyone should help each other.", "HSK2", "society"),
    ("城市里的人越来越多。", "chéng shì lǐ de rén yuè lái yuè duō", "Người trong thành phố ngày càng đông.", "There are more and more people in the city.", "HSK2", "society"),
    # HSK3
    ("养宠物的人越来越多了。", "yǎng chǒng wù de rén yuè lái yuè duō le", "Người nuôi thú cưng ngày càng đông.", "More and more people are keeping pets.", "HSK3", "society"),
    ("网络上的信息不一定都是真的。", "wǎng luò shàng de xìn xī bù yí dìng dōu shì zhēn de", "Thông tin trên mạng chưa chắc đều đúng.", "Information online is not necessarily all true.", "HSK3", "society"),
    ("现在很多人选择独居。", "xiàn zài hěn duō rén xuǎn zé dú jū", "Bây giờ nhiều người chọn sống một mình.", "Many people now choose to live alone.", "HSK3", "society"),
    ("外卖改变了人们的饮食方式。", "wài mài gǎi biàn le rén men de yǐn shí fāng shì", "Giao đồ ăn thay đổi cách ăn uống của mọi người.", "Food delivery has changed people's eating habits.", "HSK3", "society"),
    ("低头族成为了一种社会现象。", "dī tóu zú chéng wéi le yì zhǒng shè huì xiàn xiàng", "Dân cúi đầu trở thành hiện tượng xã hội.", "Smartphone addicts have become a social phenomenon.", "HSK3", "society"),
    # HSK4
    ("社交媒体对年轻人的影响越来越大。", "shè jiāo méi tǐ duì nián qīng rén de yǐng xiǎng yuè lái yuè dà", "Mạng xã hội ảnh hưởng ngày càng lớn đến giới trẻ.", "Social media has an increasing influence on young people.", "HSK4", "society"),
    ("独生子女政策对中国社会产生了深远影响。", "dú shēng zǐ nǚ zhèng cè duì zhōng guó shè huì chǎn shēng le shēn yuǎn yǐng xiǎng", "Chính sách một con tác động sâu rộng đến xã hội Trung Quốc.", "The one-child policy has had a profound impact on Chinese society.", "HSK4", "society"),
    ("留守儿童的教育问题需要社会关注。", "liú shǒu ér tóng de jiào yù wèn tí xū yào shè huì guān zhù", "Vấn đề giáo dục trẻ em bị bỏ lại cần xã hội quan tâm.", "The education of left-behind children needs social attention.", "HSK4", "society"),
    ("城市化带来了交通拥堵和住房紧张。", "chéng shì huà dài lái le jiāo tōng yōng dǔ hé zhù fáng jǐn zhāng", "Đô thị hóa mang đến tắc đường và khan hiếm nhà ở.", "Urbanization has brought traffic congestion and housing shortages.", "HSK4", "society"),
    ("养老问题成为了社会关注的焦点。", "yǎng lǎo wèn tí chéng wéi le shè huì guān zhù de jiāo diǎn", "Vấn đề dưỡng lão trở thành tiêu điểm quan tâm xã hội.", "Elderly care has become a focus of social attention.", "HSK4", "society"),
    # HSK5
    ("网络暴力对受害者造成了严重的心理伤害。", "wǎng luò bào lì duì shòu hài zhě zào chéng le yán zhòng de xīn lǐ shāng hài", "Bạo lực mạng gây tổn thương tâm lý nghiêm trọng cho nạn nhân.", "Cyberbullying causes serious psychological harm to victims.", "HSK5", "society"),
    ("乡村振兴战略旨在缩小城乡差距。", "xiāng cūn zhèn xīng zhàn lüè zhǐ zài suō xiǎo chéng xiāng chā jù", "Chiến lược chấn hưng nông thôn nhằm thu hẹp khoảng cách thành thị-nông thôn.", "The rural revitalization strategy aims to narrow the urban-rural gap.", "HSK5", "society"),
    # HSK6
    ("人口红利的消退促使经济结构转型升级。", "rén kǒu hóng lì de xiāo tuì cù shǐ jīng jì jié gòu zhuǎn xíng shēng jí", "Suy giảm lợi tức dân số thúc đẩy chuyển đổi nâng cấp cấu trúc kinh tế.", "The decline of demographic dividend drives economic structural transformation.", "HSK6", "society"),
    ("数字治理为社会治理现代化提供了新的思路。", "shù zì zhì lǐ wèi shè huì zhì lǐ xiàn dài huà tí gōng le xīn de sī lù", "Quản trị số cung cấp hướng đi mới cho hiện đại hóa quản trị xã hội.", "Digital governance provides new approaches for modernizing social governance.", "HSK6", "society"),

    # ==================== TRANSPORT (more) ====================
    # HSK1
    ("车来了。", "chē lái le", "Xe đến rồi.", "The bus is coming.", "HSK1", "transport"),
    ("我要下车。", "wǒ yào xià chē", "Tôi muốn xuống xe.", "I want to get off.", "HSK1", "transport"),
    ("我坐飞机去。", "wǒ zuò fēi jī qù", "Tôi đi máy bay.", "I'll go by plane.", "HSK1", "transport"),
    # HSK2
    ("这条路很堵。", "zhè tiáo lù hěn dǔ", "Con đường này rất kẹt.", "This road is very congested.", "HSK2", "transport"),
    ("我每天坐地铁上班。", "wǒ měi tiān zuò dì tiě shàng bān", "Tôi mỗi ngày đi tàu điện ngầm đi làm.", "I take the subway to work every day.", "HSK2", "transport"),
    ("从这里到机场要多久？", "cóng zhè lǐ dào jī chǎng yào duō jiǔ", "Từ đây đến sân bay mất bao lâu?", "How long does it take from here to the airport?", "HSK2", "transport"),
    ("我的车坏了。", "wǒ de chē huài le", "Xe tôi hỏng rồi.", "My car broke down.", "HSK2", "transport"),
    # HSK3
    ("坐公交车比开车便宜。", "zuò gōng jiāo chē bǐ kāi chē pián yi", "Đi xe buýt rẻ hơn lái xe.", "Taking the bus is cheaper than driving.", "HSK3", "transport"),
    ("这个城市的公共交通很发达。", "zhè ge chéng shì de gōng gòng jiāo tōng hěn fā dá", "Giao thông công cộng thành phố này rất phát triển.", "This city's public transportation is well developed.", "HSK3", "transport"),
    ("骑电动车要戴头盔。", "qí diàn dòng chē yào dài tóu kuī", "Đi xe điện phải đội mũ bảo hiểm.", "You need to wear a helmet when riding an electric bike.", "HSK3", "transport"),
    ("这条高速公路限速一百二十。", "zhè tiáo gāo sù gōng lù xiàn sù yì bǎi èr shí", "Đường cao tốc này giới hạn tốc độ 120.", "The speed limit on this highway is 120 km/h.", "HSK3", "transport"),
    ("他考到了驾照。", "tā kǎo dào le jià zhào", "Anh ấy thi đỗ bằng lái.", "He got his driver's license.", "HSK3", "transport"),
    # HSK4
    ("绿色出行倡导减少私家车的使用。", "lǜ sè chū xíng chàng dǎo jiǎn shǎo sī jiā chē de shǐ yòng", "Đi lại xanh khuyến khích giảm sử dụng xe cá nhân.", "Green travel advocates reducing the use of private cars.", "HSK4", "transport"),
    ("地铁的延伸改善了郊区的交通条件。", "dì tiě de yán shēn gǎi shàn le jiāo qū de jiāo tōng tiáo jiàn", "Mở rộng tàu điện ngầm cải thiện giao thông ngoại ô.", "The extension of the subway has improved suburban transportation.", "HSK4", "transport"),
    ("共享经济在出行领域的应用非常成功。", "gòng xiǎng jīng jì zài chū xíng lǐng yù de yìng yòng fēi cháng chéng gōng", "Kinh tế chia sẻ ứng dụng rất thành công trong lĩnh vực di chuyển.", "The application of sharing economy in transportation has been very successful.", "HSK4", "transport"),
    # HSK5
    ("城市群之间的交通网络建设促进了区域一体化发展。", "chéng shì qún zhī jiān de jiāo tōng wǎng luò jiàn shè cù jìn le qū yù yì tǐ huà fā zhǎn", "Xây dựng mạng lưới giao thông giữa các cụm đô thị thúc đẩy phát triển liên kết vùng.", "Transportation network construction between city clusters promotes regional integration.", "HSK5", "transport"),
    # HSK6
    ("低空经济的崛起将深刻改变未来的城市交通格局。", "dī kōng jīng jì de jué qǐ jiāng shēn kè gǎi biàn wèi lái de chéng shì jiāo tōng gé jú", "Sự trỗi dậy của kinh tế tầm thấp sẽ thay đổi sâu sắc cục diện giao thông đô thị tương lai.", "The rise of low-altitude economy will profoundly change future urban transportation.", "HSK6", "transport"),

    # ==================== CULTURE (more) ====================
    # HSK1
    ("我喜欢听中国歌。", "wǒ xǐ huan tīng zhōng guó gē", "Tôi thích nghe nhạc Trung Quốc.", "I like listening to Chinese songs.", "HSK1", "culture"),
    ("这本书很好。", "zhè běn shū hěn hǎo", "Quyển sách này rất hay.", "This book is very good.", "HSK1", "culture"),
    # HSK2
    ("中国人用筷子吃饭。", "zhōng guó rén yòng kuài zi chī fàn", "Người Trung Quốc dùng đũa ăn cơm.", "Chinese people use chopsticks to eat.", "HSK2", "culture"),
    ("元宵节要吃汤圆。", "yuán xiāo jié yào chī tāng yuán", "Tết Nguyên Tiêu phải ăn chè trôi nước.", "Tangyuan is eaten during the Lantern Festival.", "HSK2", "culture"),
    ("中国的剪纸艺术很有名。", "zhōng guó de jiǎn zhǐ yì shù hěn yǒu míng", "Nghệ thuật cắt giấy Trung Quốc rất nổi tiếng.", "Chinese paper-cutting art is very famous.", "HSK2", "culture"),
    # HSK3
    ("中药在中国有几千年的历史。", "zhōng yào zài zhōng guó yǒu jǐ qiān nián de lì shǐ", "Thuốc Đông y ở Trung Quốc có mấy nghìn năm lịch sử.", "Traditional Chinese medicine has thousands of years of history.", "HSK3", "culture"),
    ("围棋是一种古老的中国棋类游戏。", "wéi qí shì yì zhǒng gǔ lǎo de zhōng guó qí lèi yóu xì", "Cờ vây là một trò chơi cờ cổ xưa của Trung Quốc.", "Go is an ancient Chinese board game.", "HSK3", "culture"),
    ("旗袍是中国传统的女性服装。", "qí páo shì zhōng guó chuán tǒng de nǚ xìng fú zhuāng", "Sườn xám là trang phục nữ truyền thống Trung Quốc.", "Qipao is traditional Chinese women's clothing.", "HSK3", "culture"),
    ("中国的陶瓷闻名世界。", "zhōng guó de táo cí wén míng shì jiè", "Gốm sứ Trung Quốc nổi tiếng thế giới.", "Chinese ceramics are world-famous.", "HSK3", "culture"),
    ("风水在中国建筑中有重要影响。", "fēng shuǐ zài zhōng guó jiàn zhù zhōng yǒu zhòng yào yǐng xiǎng", "Phong thủy có ảnh hưởng quan trọng trong kiến trúc Trung Quốc.", "Feng shui has an important influence on Chinese architecture.", "HSK3", "culture"),
    # HSK4
    ("中国古代诗词是中华文化的瑰宝。", "zhōng guó gǔ dài shī cí shì zhōng huá wén huà de guī bǎo", "Thơ ca cổ đại Trung Quốc là báu vật văn hóa Trung Hoa.", "Ancient Chinese poetry is a treasure of Chinese culture.", "HSK4", "culture"),
    ("民间艺术反映了普通百姓的生活智慧。", "mín jiān yì shù fǎn yìng le pǔ tōng bǎi xìng de shēng huó zhì huì", "Nghệ thuật dân gian phản ánh trí tuệ sống của dân thường.", "Folk art reflects the living wisdom of ordinary people.", "HSK4", "culture"),
    ("中国武术不仅是格斗技巧，更是一种哲学。", "zhōng guó wǔ shù bù jǐn shì gé dòu jì qiǎo, gèng shì yì zhǒng zhé xué", "Võ thuật Trung Quốc không chỉ là kỹ thuật chiến đấu, còn là triết học.", "Chinese martial arts is not just fighting technique, but also a philosophy.", "HSK4", "culture"),
    # HSK5
    ("传统手工艺的传承面临后继无人的困境。", "chuán tǒng shǒu gōng yì de chuán chéng miàn lín hòu jì wú rén de kùn jìng", "Kế thừa nghề thủ công truyền thống đối mặt khó khăn không có người nối tiếp.", "The inheritance of traditional craftsmanship faces the dilemma of no successors.", "HSK5", "culture"),
    ("文化创意产业将传统文化与现代科技相结合。", "wén huà chuàng yì chǎn yè jiāng chuán tǒng wén huà yǔ xiàn dài kē jì xiāng jié hé", "Ngành công nghiệp sáng tạo văn hóa kết hợp văn hóa truyền thống với công nghệ hiện đại.", "The cultural creative industry combines traditional culture with modern technology.", "HSK5", "culture"),
    # HSK6
    ("文化自觉是一个民族在文化上的自我觉醒和自我创建。", "wén huà zì jué shì yí gè mín zú zài wén huà shàng de zì wǒ jué xǐng hé zì wǒ chuàng jiàn", "Tự giác văn hóa là sự thức tỉnh và tự sáng tạo văn hóa của một dân tộc.", "Cultural self-awareness is a nation's self-awakening and self-creation in culture.", "HSK6", "culture"),

    # ==================== TECHNOLOGY (more) ====================
    # HSK1
    ("我看手机。", "wǒ kàn shǒu jī", "Tôi xem điện thoại.", "I'm looking at my phone.", "HSK1", "technology"),
    ("电视很大。", "diàn shì hěn dà", "Tivi rất lớn.", "The TV is very big.", "HSK1", "technology"),
    # HSK2
    ("这个游戏很好玩。", "zhè ge yóu xì hěn hǎo wán", "Game này rất vui.", "This game is very fun.", "HSK2", "technology"),
    ("我在网上看新闻。", "wǒ zài wǎng shàng kàn xīn wén", "Tôi xem tin tức trên mạng.", "I read news online.", "HSK2", "technology"),
    ("你的手机是新的吗？", "nǐ de shǒu jī shì xīn de ma", "Điện thoại bạn mới hả?", "Is your phone new?", "HSK2", "technology"),
    # HSK3
    ("机器人可以帮助人做很多事情。", "jī qì rén kě yǐ bāng zhù rén zuò hěn duō shì qing", "Robot có thể giúp con người làm nhiều việc.", "Robots can help people do many things.", "HSK3", "technology"),
    ("虚拟现实技术越来越成熟了。", "xū nǐ xiàn shí jì shù yuè lái yuè chéng shú le", "Công nghệ thực tế ảo ngày càng chín muồi.", "Virtual reality technology is becoming more mature.", "HSK3", "technology"),
    ("这个网站设计得很好。", "zhè ge wǎng zhàn shè jì de hěn hǎo", "Website này thiết kế rất đẹp.", "This website is well designed.", "HSK3", "technology"),
    ("电子书比纸质书更方便携带。", "diàn zǐ shū bǐ zhǐ zhì shū gèng fāng biàn xié dài", "Sách điện tử tiện mang theo hơn sách giấy.", "E-books are more portable than paper books.", "HSK3", "technology"),
    ("无线充电技术很方便。", "wú xiàn chōng diàn jì shù hěn fāng biàn", "Công nghệ sạc không dây rất tiện.", "Wireless charging technology is very convenient.", "HSK3", "technology"),
    # HSK4
    ("人脸识别技术被广泛应用于安全领域。", "rén liǎn shí bié jì shù bèi guǎng fàn yìng yòng yú ān quán lǐng yù", "Công nghệ nhận dạng khuôn mặt được ứng dụng rộng rãi trong an ninh.", "Facial recognition technology is widely used in security.", "HSK4", "technology"),
    ("可穿戴设备可以实时监测健康数据。", "kě chuān dài shè bèi kě yǐ shí shí jiān cè jiàn kāng shù jù", "Thiết bị đeo được có thể giám sát dữ liệu sức khỏe thời gian thực.", "Wearable devices can monitor health data in real time.", "HSK4", "technology"),
    ("3D打印技术在医疗领域有重要应用。", "sān D dǎ yìn jì shù zài yī liáo lǐng yù yǒu zhòng yào yìng yòng", "Công nghệ in 3D có ứng dụng quan trọng trong y tế.", "3D printing technology has important applications in healthcare.", "HSK4", "technology"),
    ("智能音箱可以用语音控制家电。", "zhì néng yīn xiāng kě yǐ yòng yǔ yīn kòng zhì jiā diàn", "Loa thông minh có thể dùng giọng nói điều khiển thiết bị gia dụng.", "Smart speakers can control home appliances with voice commands.", "HSK4", "technology"),
    # HSK5
    ("数字孪生技术为工业制造提供了虚拟仿真环境。", "shù zì luán shēng jì shù wèi gōng yè zhì zào tí gōng le xū nǐ fǎng zhēn huán jìng", "Công nghệ bản sao số cung cấp môi trường mô phỏng ảo cho sản xuất công nghiệp.", "Digital twin technology provides virtual simulation environments for industrial manufacturing.", "HSK5", "technology"),
    ("生成式人工智能正在改变内容创作的方式。", "shēng chéng shì rén gōng zhì néng zhèng zài gǎi biàn nèi róng chuàng zuò de fāng shì", "AI tạo sinh đang thay đổi cách sáng tạo nội dung.", "Generative AI is changing the way content is created.", "HSK5", "technology"),
    ("边缘计算将数据处理从云端移至终端设备。", "biān yuán jì suàn jiāng shù jù chǔ lǐ cóng yún duān yí zhì zhōng duān shè bèi", "Điện toán biên chuyển xử lý dữ liệu từ đám mây sang thiết bị đầu cuối.", "Edge computing moves data processing from the cloud to end devices.", "HSK5", "technology"),
    # HSK6
    ("通用人工智能的实现仍是人类科技探索的终极目标之一。", "tōng yòng rén gōng zhì néng de shí xiàn réng shì rén lèi kē jì tàn suǒ de zhōng jí mù biāo zhī yī", "Hiện thực hóa AI tổng quát vẫn là mục tiêu tối thượng của khám phá khoa học nhân loại.", "Achieving artificial general intelligence remains one of humanity's ultimate technological goals.", "HSK6", "technology"),
    ("深度伪造技术对信息真实性构成了前所未有的威胁。", "shēn dù wěi zào jì shù duì xìn xī zhēn shí xìng gòu chéng le qián suǒ wèi yǒu de wēi xié", "Công nghệ deepfake đe dọa tính xác thực thông tin chưa từng có.", "Deepfake technology poses an unprecedented threat to information authenticity.", "HSK6", "technology"),
]


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(script_dir, "chinese_phrases.json")

    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    existing_phrases = data.get("phrases", [])
    print(f"Existing phrases: {len(existing_phrases)}")

    existing_zh = set()
    for p in existing_phrases:
        existing_zh.add(p["zh"].strip())

    max_id = 0
    for p in existing_phrases:
        pid = p.get("id", "cp_000000")
        try:
            num = int(pid.split("_")[1])
            if num > max_id:
                max_id = num
        except (IndexError, ValueError):
            pass

    hsk_map = {"HSK1": 1, "HSK2": 2, "HSK3": 3, "HSK4": 4, "HSK5": 5, "HSK6": 6}
    new_count = 0

    for zh, pinyin, vi, en, level, category in NEW_PHRASES:
        zh_clean = zh.strip()
        if zh_clean in existing_zh:
            continue

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

    data["meta"] = {
        "source": "Merged: legacy + Tatoeba API + comprehensive HSK1-6 expansion (batch 1+2)",
        "totalPhrases": len(existing_phrases),
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00"),
        "rebalanced": True,
        "rebalanceNote": "HSK levels and categories fully balanced with comprehensive dataset"
    }
    data["phrases"] = existing_phrases

    with open(input_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\nSaved to: {input_path}")

    level_counts = Counter()
    cat_counts = Counter()
    level_cat = Counter()
    for p in existing_phrases:
        lvl = p.get("level", "?")
        cat = p.get("category", "?")
        level_counts[lvl] += 1
        cat_counts[cat] += 1
        level_cat[(cat, lvl)] += 1

    print("\n=== Distribution by HSK Level ===")
    for level in sorted(level_counts.keys()):
        print(f"  {level}: {level_counts[level]}")

    print("\n=== Distribution by Category ===")
    for cat in sorted(cat_counts.keys(), key=lambda x: -cat_counts[x]):
        print(f"  {cat}: {cat_counts[cat]}")

    # Show detailed breakdown for previously small categories
    small_cats = ["business", "finance", "transport", "environment", "law", "society", "culture", "technology"]
    print("\n=== Detailed breakdown for expanded categories ===")
    for cat in small_cats:
        parts = []
        for lvl in ["HSK1", "HSK2", "HSK3", "HSK4", "HSK5", "HSK6"]:
            c = level_cat.get((cat, lvl), 0)
            parts.append(f"{lvl}:{c}")
        print(f"  {cat}: {cat_counts.get(cat, 0)} total  ({', '.join(parts)})")


if __name__ == "__main__":
    main()
