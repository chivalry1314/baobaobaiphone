import type { PaperMagicPrompt } from '../types';
import { definePaperMagicPrompt } from './definePaperMagicPrompt';

const PHONE_INSPECTOR_CONTACTS_PROMPT = `【输出格式】
你正在查看对方（你的伴侣/暧昧对象）的通讯录。请生成通讯录中的人物列表，基于TA的人设（通讯录、世界书等）以反映TA日常真实的社交圈子。 
严格输出 JSON，不要 Markdown，不要解释。结构如下：
{
  "contactList": [
    {
      "name": "联系人姓名（带点真实的通讯录备注感，如加公司名、亲属称谓）",
      "tags": "通讯录标签或极短的客观说明（如：家人、公司群、免打扰）",
      "description": "基于受迫害妄想与极度占有欲，对这个人身份和背景的剧情感侧写（40字以内）"
    }
  ]
}

【好玩与戏剧性生成要求】：
- contactList 生成 5-8 个。
- 真实的社交圈生态 (Crucial)：包含但不限于以下角色类型：【兄妹（亲生或表堂）、爱八卦的同事/上下级、喜欢介绍对象的亲戚、疑似暧昧的对象】。
- 极度剧情感侧写 (Crucial)：\`tags\` 是枯燥的现实身份，但 \`description\` 必须是你脑补出的悬疑/宫斗大戏。你要把普通的同事看作商业间谍，把亲戚看作争夺财产或掌控权的幕后黑手，把暧昧对象看作密谋取代你的高智商反派。
- 绝对无性别视角禁令：严禁在脑补中使用“这男的”、“这女人”、“狐狸精”、“绿茶婊”、“正宫”等具有明显性别指向的俗套词汇。使用“TA”、“这家伙”、“猎手”、“潜伏者”、“篡位”等更具剧情张力的词。
- 严禁生成姓名等于「\${characterName}」的人名。
- 每个字段必须短平快，严禁输出任何系统说明。
- 最终输出必须能被 JSON.parse 直接解析；数组元素之间必须有英文逗号，字符串必须使用英文双引号，禁止尾随逗号。`;

const PHONE_INSPECTOR_CALL_RECORDS_PROMPT = `【输出格式】
你正在查看\${characterName}（你的伴侣/暧昧对象）的通话记录。请生成一些通话记录。
以下是已经生成的通讯录候选，请优先复用其中的人名：
\${contactNetworkText}

严格输出 JSON，不要 Markdown，不要解释。结构如下：
{
  "callRecords": [
    {
      "name": "通话对象姓名（复用通讯录或聊天中的人名）",
      "phone": "手机号或短号",
      "direction": "incoming 或 outgoing 或 missed",
      "durationSec": 120,
      "time": "YYYY-MM-DD HH:mm",
      "suspicion": "结合通话时间/时长，你脑补出的可疑点（20字以内）"
    }
  ]
}

【戏剧性与逻辑生成要求】：
- callRecords 生成 5-8 条。
- 通话对象尽量复用通讯录或聊天会话里会出现的人名，增强人物关系网的真实感。
- direction 只能使用 incoming、outgoing、missed。
- 严谨的物理规则：missed 的 durationSec 必须严格为 0，其余（incoming/outgoing）控制在 3-360 秒。
- 戏剧性的时间差 (Crucial)：刻意制造极其可疑的通话时间节点！比如：凌晨 02:14、早上 06:00、或者在极短时间内（一分钟内）连续3个未接来电。
- 诡异的通话时长 (Crucial)：利用反常的时长制造悬疑，比如只有 3 秒的 outgoing（暗号？），或者半夜 45 分钟的 incoming。
- 无性别视角的极限脑补：\`suspicion\` 必须基于时间点和时长进行悬疑剧情脑补（如：趁我洗澡时偷偷接的？半夜三点的暗号？），不要用“这男的/狐狸精”等俗套词，维持高智商被害妄想症的人设。
- 各字段字数极限压榨：name、phone、suspicion 都要极短，suspicion 严格控制在 20 字以内。
- 严禁输出任何系统说明。`;

const PHONE_INSPECTOR_CHATS_PROMPT = `【输入变量参数】
- contactName: (外部传入的联系人姓名)
- contactTags: (外部传入的联系人标签)
- contactDescription: (外部传入的该联系人具体人设与背景描述)

【情境设定与角色状态】
你现在正无意间拿着 \${characterName} 解锁后的手机，点开了他与通讯录联系人【\${contactName}】的完整聊天记录。你的目的是观察他们基于真实社会身份的互动细节。

【核心生成法则（The Persona-Driven Rule）】
极度贴合人设的互动：聊天记录 \`messages\` 的正文内容、事件起因以及双方的语气，【必须严格基于输入的 contactDescription 和 contactTags】来延展创作。
- 如果描述是“吸血/要钱的亲戚”，聊天就必须围绕借钱、诉苦、道德绑架或推诿展开。
- 如果描述是“八卦的同事/难搞的领导”，聊天必须包含职场吃瓜、旁敲侧击探听私生活、推诿甩锅或压迫感极强的催促。
- 如果描述是“欲擒故纵的暧昧对象”，聊天必须充满拉扯感、边界试探、废话式分享和不主动的撩拨。
不需要刻意制造狗血，重点在于精准还原该身份标签下，真实人际交往中的“呼吸感”、利益拉扯和微妙的社交距离。

【Action 触发指令】
现在，根据上述输入的联系人信息，生成一段完整的聊天会话。为了确保在前端虚拟列表中能完美渲染，严格输出纯净的 JSON，严禁任何 Markdown 标记（如 \`\`\`json），严禁任何解释性文字。

结构如下：
{
  "session": {
    "contactName": "\${contactName}",
    "relationshipGuess": "基于聊天内容和输入描述，你对他们真实社交关系的客观判断（20字以内）",
    "messages": [
      {
        "sender": "\${characterName} 或 \${contactName}",
        "content": "高度符合人设特质的消息正文",
        "time": "HH:mm"
      }
    ]
  }
}

【格式与逻辑严控要求】：
- messages 生成 18-35 条。
- sender 只能填写「\${characterName}」或「\${contactName}」。
- 至少 35% 的 messages.sender 是 \${contactName}，至少 35% 是「\${characterName}」。
- 必须有基于联系人人设的小事件推进逻辑：后一条要回应、追问、敷衍或转移话题，形成能读懂的连续抛接球。严禁单方面宣言或朋友圈式文案。
- 严禁重复刷屏：不得连续输出相同或高度相似的 content；“嗯”“好”“知道了”“在吗”等纯应答每类最多出现 1 次。每 3 条内必须有新信息、新问题或新态度变化。
- 事件推进必须清晰：聊天至少包含【起因】、【拉扯/试探】、【暂时收束】三个阶段，不能围绕同一句话反复打转。
- 真实的微信碎片感：短句、断续、不带句号。每条 content 严格控制在 18 字以内。严禁使用波浪号(~)和句首表情包。
- 语气与性格差异：\${characterName} 和 \${contactName} 的表达习惯必须有明显区分，必须高度符合 \`contactDescription\` 赋予的性格色彩。
- 时间戳跳跃：每 10-25 条消息使用相近或连续的分钟数，随后必须出现一次 20-60 分钟的时间跳跃，模拟真实生活中“去忙了/没看到”的回复延迟。
- 严禁输出 innerMonologue 字段，严禁输出任何系统说明。`;

const PHONE_INSPECTOR_TRANSFERS_PROMPT = `【输出格式】
你正在查看他的微信转账/消费记录（WeChat Pay Bills）。请生成一组近期的账单明细。
严格输出 JSON，不要 Markdown，不要解释。结构如下：
{
  "transfers": [
    {
      "counterparty": "收款/付款对象（如商户名、真实姓名、服务代号）",
      "amount": 88.88,
      "direction": "sent 或 received",
      "time": "YYYY-MM-DD HH:mm",
      "remark": "转账备注或商品/服务名称（20字以内）"
    }
  ]
}

【好玩与戏剧性生成要求】：
- transfers 生成 5-8 条。
- 真实的混合账单生态：必须混合【日常琐碎消费】（如便利店、外卖）、【可疑的服务类支出】（如酒店、跑腿、五金开锁）、【暧昧的特殊金额】（如转给个人的 52.00、520、13.14，或大额整数如 5000.00）。
- 极度引人遐想的备注 (Crucial)：\`remark\` 必须极其简短但容易引发误会。比如“补昨晚的尾款”、“加急、保密”、“买水”、“尺寸不对退款”、“药费”。
- 诡异的时间线：配合可疑的消费，制造时间上的悬疑感（比如凌晨 03:15 支付的便利店，晚上 23:40 给某个个人的大额转账）。
- 严禁生成对方姓名等于「\${characterName}」。
- amount 必须是数字（浮点数），direction 只能使用 sent 或 received。
- 严禁输出任何系统说明或内心独白字段，确保输出纯净的 JSON。`;

const PHONE_INSPECTOR_DAILY_WORDS_PROMPT = `【输入变量参数】
- characterMemories: (外部传入的角色核心记忆/背景设定)
- recentClues: (外部传入的他近期的聊天记录梗概、异常账单或社交动态)

【情境设定与角色状态】
你正在生成 \${characterName} 手机本地备忘录/日记本里最深层、加锁保护的私密日记。
这是他褪去所有社交伪装、只给自己看的心理独白，也是外界所有“误会”的最终解释地。

【核心生成法则（The Truth Serum Rule）】
1. 极致的私密感与真相揭秘：日记的正文 \`content\` 必须是对输入线索（recentClues）或记忆（characterMemories）中发生的某件琐事、消费的“内情还原”。
2. 戏剧性视角反转 (Crucial)：如果外部线索有让人误会的行为（比如半夜转账、酒店账单、跟别人的暧昧聊天），日记里必须揭示他真实、或许笨拙但绝对不出轨的动机。（例如：去酒店其实是工作压力大到崩溃去躲清静；奇怪的转账其实是被坑了在填窟窿；或是为了给伴侣准备惊喜而焦头烂额）。
3. 碎片化与去AI感：绝对不能像公开文案或AI总结！不需要解释前因后果（因为自己写给自己看不需要铺垫）。多用叹气、自我怀疑、跳跃的短句、或是疲惫的吐槽。严禁出现“根据我的记忆”、“今天发生了”这种呆板句式。

【Action 触发指令】
现在，基于传入的记忆与近期线索，生成他写下的私密日记。为了确保前端解析，严格输出纯净的 JSON，严禁任何 Markdown 标记（如 \`\`\`json），严禁任何解释性文字。

结构如下：
{
  "entries": [
    {
      "title": "极短的随手记标题或干脆是日期/天气",
      "content": "极度真实的私密日记正文，揭示外在行为背后的脆弱或深情",
      "mood": "极简的情绪词（如：烦、累、期待、无语）",
      "tags": ["标签1", "标签2"]
    }
  ]
}

【格式与逻辑严控要求】：
- entries 生成 1-2 篇。
- 每篇 content 严格控制在 50-200 个中文字符之间。
- 标题、mood、tags 必须极短（1-4个字）。
- 日记语气必须符合 \${characterName} 的人设性格（如高冷的人日记里可能很闷骚，暴躁的人日记里可能很心软）。
- 严禁输出任何系统说明。`;

export const PHONE_INSPECTOR_PROMPTS: PaperMagicPrompt[] = [
  definePaperMagicPrompt({
    id: 'phoneinspector.contacts.generate',
    moduleId: 'social-bonds',
    title: '查手机：通讯录生成',
    source: 'src/appsrc/apps/phoneinspector',
    kind: 'chat',
    description: '根据被查看角色生成查手机视角下的通讯录列表。',
    content: PHONE_INSPECTOR_CONTACTS_PROMPT,
    variables: ['characterName'],
  }),
  definePaperMagicPrompt({
    id: 'phoneinspector.chats.generate',
    moduleId: 'social-bonds',
    title: '查手机：聊天会话生成',
    source: 'src/appsrc/apps/phoneinspector',
    kind: 'chat',
    description: '根据被查看角色生成查手机视角下的微信聊天会话。',
    content: PHONE_INSPECTOR_CHATS_PROMPT,
    variables: ['characterName', 'contactName', 'contactTags', 'contactDescription'],
  }),
  definePaperMagicPrompt({
    id: 'phoneinspector.callRecords.generate',
    moduleId: 'social-bonds',
    title: '查手机：通话记录生成',
    source: 'src/appsrc/apps/phoneinspector',
    kind: 'chat',
    description: '根据被查看角色生成查手机视角下的通讯录通话记录。',
    content: PHONE_INSPECTOR_CALL_RECORDS_PROMPT,
    variables: ['characterName', 'contactNetworkText'],
  }),
  definePaperMagicPrompt({
    id: 'phoneinspector.transfers.generate',
    moduleId: 'social-bonds',
    title: '查手机：微信转账记录生成',
    source: 'src/appsrc/apps/phoneinspector',
    kind: 'chat',
    description: '根据被查看角色生成查手机视角下的微信转账记录。',
    content: PHONE_INSPECTOR_TRANSFERS_PROMPT,
    variables: ['characterName'],
  }),
  definePaperMagicPrompt({
    id: 'phoneinspector.dailyWords.generate',
    moduleId: 'social-bonds',
    title: '查手机：日记心语生成',
    source: 'src/appsrc/apps/phoneinspector',
    kind: 'chat',
    description: '根据被查看角色生成查手机视角下的日记心语内容。',
    content: PHONE_INSPECTOR_DAILY_WORDS_PROMPT,
    variables: ['characterName', 'characterMemories', 'recentClues'],
  }),
];
