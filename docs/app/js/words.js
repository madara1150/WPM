// คลังข้อความเขียนขึ้นใหม่: คำทั่วไป สุภาษิต และวรรณกรรมที่พ้นลิขสิทธิ์แล้ว

const split = (s) => s.trim().split(/\s+/);

export const LANGUAGES = {
  en: {
    label: 'English',
    words: {
      easy: split(`the be to of and in that have it for not on with he as you do at this but his by from they we say her she
        or an will my one all would there their what so up out if about who get which go me when make can like time no just
        him know take people into year your good some could them see other than then now look only come its over think also
        back after use two how our work first well way even new want because any these give day most us is was are been has
        had were said did find long down made many more may water call may part sound place little very through just name
        great help line turn much mean before move right boy old too same tell does set three air play small end put home
        read hand port large spell add land here must big high such follow act why ask men change went light kind off need
        house picture try again animal point mother world near build self earth father head stand own page should country
        found answer school grow study still learn plant cover food sun four thought let keep eye never last door between
        city tree cross since hard start might story saw far sea draw left late run while press close night real life few stop`),
      medium: split(`another different thought together important children example paper group always music those both mark often
        letter until mile river car feet care second enough plain girl usual young ready above ever red list though feel talk
        bird soon body dog family direct pose leave song measure state product black short numeral class wind question happen
        complete ship area half rock order fire south problem piece told knew pass farm top whole king size heard best hour
        better during hundred remember step early hold west ground interest reach fast five sing listen table travel less
        morning simple several vowel toward against pattern slow center love person money serve appear road map science rule
        govern pull cold notice voice fall power town fine certain fly unit lead cry dark machine note wait plan figure star
        box noun field rest correct able pound done beauty drive stood contain front teach week final gave green quick develop
        sleep warm free minute strong special mind behind clear tail produce fact street inch nothing course stay wheel full
        force blue object decide surface deep moon island foot yet busy test record boat common gold possible plane age dry
        wonder laugh thousand ago ran check game shape yes hot miss brought heat snow bed bring sit perhaps fill east weight
        language among keyboard computer program student practice typing network memory digital future project`),
      hard: split(`acquaintance bureaucracy conscientious chrysanthemum questionnaire onomatopoeia surveillance pharmaceutical
        idiosyncrasy juxtaposition entrepreneur rhythm synchronize mischievous millennium accommodate embarrass exaggerate
        perseverance maintenance reconnaissance unnecessary pronunciation miscellaneous quintessential sophisticated
        hypothesis equilibrium phenomenon paradigm ambiguous benevolent cacophony deliberate ephemeral fastidious gregarious
        hierarchy incandescent jeopardize kaleidoscope labyrinth meticulous nonchalant obfuscate paraphernalia quarantine
        resilience serendipity tenacious ubiquitous vicarious whimsical xylophone yacht zephyr algorithm asynchronous
        cryptography encapsulation heterogeneous infrastructure latency middleware polymorphism recursion scalability
        semaphore throughput virtualization authentication concurrency deterministic idempotent microprocessor`),
    },
    quotes: [
      'A journey of a thousand miles begins with a single step.',
      'Practice does not make perfect; it makes progress you can measure.',
      'The quick brown fox jumps over the lazy dog while the sly cat watches.',
      'Pack my box with five dozen liquor jugs before the sun goes down.',
      'Slow is smooth, and smooth is fast: accuracy first, then speed will follow.',
      'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.',
      'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.',
      'Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do.',
      'Call me Ishmael. Some years ago, never mind how long precisely, having little or no money in my purse, I thought I would sail about a little.',
      'Many years later, the old clock in the hall still struck thirteen, and nobody in the house dared to mention it.',
      'Do not look at the keyboard. Your fingers remember more than you think, and they only need you to trust them.',
      'A student in Bangkok once wrote a typing game in C. It had three levels, one timer, and a very big dream.',
      'When in doubt, tell the truth. It will confuse your enemies and astonish your friends.',
      'Fortune favors the prepared mind, the rested body, and the person who actually shows up on Tuesday morning.',
      'Every expert was once a beginner who refused to quit after the first bad score.',
      'The best time to plant a tree was twenty years ago. The second best time is now.',
      'Good code is read many more times than it is written, so write it for the next tired person.',
      'Rain fell on the tin roof all night, steady as a typist who has finally stopped thinking about the keys.',
    ],
  },

  th: {
    label: 'ไทย',
    words: {
      easy: split(`การ ที่ ใน มี เป็น และ ของ ได้ ไม่ จะ มา ให้ คน นี้ ไป ว่า กับ แต่ ก็ ความ เรา เขา แล้ว ผม อยู่ ทำ ดี มาก
        ใช้ นั้น กัน หรือ ถ้า วัน คุณ เมื่อ อะไร ต้อง ยัง ปี จาก บ้าน น้ำ ใจ เห็น รู้ ตา มือ ขา หัว ปาก หู ใคร ไหน ทำไม เรียน
        อ่าน เขียน พูด ฟัง กิน นอน เดิน วิ่ง นั่ง ยืน รัก ชอบ คิด ถาม ตอบ แม่ พ่อ พี่ น้อง ลูก เพื่อน ครู เด็ก หมา แมว นก ปลา
        ไก่ ข้าว ผัก ผล ไม้ ดอก รถ เรือ ทาง ถนน เมือง ป่า เขา ทะเล ฟ้า ดิน ลม ฝน แดด ดาว เดือน เช้า เย็น บ่าย คืน เวลา ปาก
        หนึ่ง สอง สาม สี่ ห้า หก เจ็ด แปด เก้า สิบ ร้อย พัน หมื่น แสน ล้าน ใหม่ เก่า ใหญ่ เล็ก สูง ต่ำ ยาว สั้น ร้อน หนาว
        เร็ว ช้า ง่าย ยาก สวย แรง เบา หนัก ขาว ดำ แดง เขียว เหลือง ฟ้า ส้ม ม่วง ชมพู`),
      medium: split(`ประเทศ ประชาชน โรงเรียน มหาวิทยาลัย นักเรียน นักศึกษา อาจารย์ หนังสือ ห้องสมุด คอมพิวเตอร์ โทรศัพท์ อินเทอร์เน็ต
        แป้นพิมพ์ หน้าจอ ข้อความ ตัวอักษร ภาษา ความเร็ว ความแม่นยำ การฝึก ทักษะ โครงการ ครอบครัว เศรษฐกิจ การเมือง สังคม
        วัฒนธรรม ประเพณี ศาสนา ธรรมชาติ สิ่งแวดล้อม อากาศ อาหาร ร้านอาหาร ตลาด โรงพยาบาล สถานี รถไฟ เครื่องบิน สนามบิน
        พิพิธภัณฑ์ วิทยาศาสตร์ คณิตศาสตร์ ประวัติศาสตร์ ภูมิศาสตร์ เทคโนโลยี นวัตกรรม พลังงาน ไฟฟ้า ปัญหา วิธีการ ตัวอย่าง
        ผลลัพธ์ เป้าหมาย ความสำเร็จ ความสุข ความฝัน ความหวัง ความรัก กำลังใจ อนาคต ปัจจุบัน อดีต ประสบการณ์ ความรู้ ความคิด
        จินตนาการ สร้างสรรค์ พัฒนา ปรับปรุง เปลี่ยนแปลง แก้ไข ตัดสินใจ รับผิดชอบ ช่วยเหลือ แบ่งปัน ทำงาน พักผ่อน ท่องเที่ยว
        เดินทาง ออกกำลังกาย สุขภาพ ร่างกาย จิตใจ อารมณ์ ความรู้สึก เรื่องราว บทความ ข่าวสาร ข้อมูล โปรแกรม`),
      hard: split(`พระมหากษัตริย์ ฤทธิ์ ฤดูกาล ปรัชญา ศักดิ์สิทธิ์ เอกลักษณ์ พฤติกรรม พฤษภาคม ทฤษฎี ปรากฏการณ์ อุตสาหกรรม เกษตรกรรม
        สถาปัตยกรรม ประชาธิปไตย รัฐธรรมนูญ ราชการ ทรัพยากร ผลิตภัณฑ์ อิเล็กทรอนิกส์ สัญลักษณ์ กฎหมาย ฆราวาส ฌาปนกิจ
        ญาติ ฎีกา ฏิมา ฐานะ ฑูต เฒ่า ณรงค์ ธรรมาภิบาล ภาพยนตร์ ศิลปวัฒนธรรม ศึกษาธิการ เศรษฐศาสตร์ สังเคราะห์ วิเคราะห์
        หลักสูตร อัตลักษณ์ ฮอร์โมน ไอศกรีม ประสิทธิภาพ ปฏิบัติ ปฏิทิน ปฏิรูป ปฏิเสธ พยาบาล พยัญชนะ ไปรษณีย์ มาตรฐาน
        ยุทธศาสตร์ ลิขสิทธิ์ เหตุการณ์ สารสนเทศ อนุรักษ์ อัจฉริยะ อุปกรณ์ อุบัติเหตุ อาชญากรรม อนุสาวรีย์ โฆษณา คริสต์ศักราช
        กรุงเทพมหานคร จักรวาล บรรณารักษ์ ภูมิปัญญา ฟิสิกส์ ซอฟต์แวร์ ฮาร์ดแวร์ แอปพลิเคชัน ไมโครโปรเซสเซอร์`),
    },
    quotes: [
      'น้ำขึ้นให้รีบตัก',
      'ช้าๆ ได้พร้าเล่มงาม',
      'ความพยายามอยู่ที่ไหน ความสำเร็จอยู่ที่นั่น',
      'กันไว้ดีกว่าแก้',
      'เข้าเมืองตาหลิ่ว ต้องหลิ่วตาตาม',
      'ไม้อ่อนดัดง่าย ไม้แก่ดัดยาก',
      'รู้ไว้ใช่ว่า ใส่บ่าแบกหาบ',
      'สิบปากว่าไม่เท่าตาเห็น สิบตาเห็นไม่เท่ามือคลำ',
      'น้ำเชี่ยวอย่าขวางเรือ',
      'ตนเป็นที่พึ่งแห่งตน',
      'อย่าเพิ่งดูแป้นพิมพ์ นิ้วของคุณจำได้มากกว่าที่คิด ขอแค่เชื่อใจมันสักหน่อย',
      'การฝึกพิมพ์ไม่ใช่การแข่งกับใคร แต่เป็นการแข่งกับตัวเองเมื่อวานนี้',
      'พิมพ์ให้ถูกก่อนแล้วความเร็วจะตามมาเอง อย่ารีบจนต้องกลับมาลบซ้ำไปซ้ำมา',
      'นักศึกษาลาดกระบังกลุ่มหนึ่งเคยเขียนเกมฝึกพิมพ์ด้วยภาษาซี จากจอดำเล็กๆ จนกลายเป็นเกมบนเว็บที่ทุกคนเล่นได้',
      'เช้านี้ฝนตกทั้งเมือง รถติดยาวไปจนสุดถนน แต่กาแฟแก้วแรกยังหอมเหมือนเดิม',
      'ถ้าวันนี้ทำได้ไม่ดี พรุ่งนี้ก็ยังมีโอกาสใหม่เสมอ ขอแค่ไม่เลิกกลางทาง',
      'ทุกคนที่เก่งในวันนี้ เคยเป็นมือใหม่ที่พิมพ์ผิดแทบทุกคำมาก่อน',
      'ภาษาไทยมีพยัญชนะสี่สิบสี่ตัว สระหลายรูป และวรรณยุกต์สี่รูป จึงเป็นภาษาที่ฝึกนิ้วได้ดีมาก',
    ],
  },

  c: {
    label: 'ภาษา C',
    words: {
      easy: split(`int char float double void return if else for while do break continue switch case default struct enum union
        typedef const static sizeof long short unsigned signed goto extern register volatile include define main NULL`),
      medium: split(`printf scanf malloc free strlen strcmp strcpy strcat fopen fclose fgets fputs sprintf memcpy memset calloc
        realloc rand srand time sleep exit stdio.h stdlib.h string.h unistd.h pthread.h windows.h argc argv buffer pointer
        array index count length thread mutex`),
      hard: split(`int*p; char**argv; i++; (void*)0; &value; arr[i]; p->next; a==b; x!=y; n%2; *ptr++; sizeof(int); #include
        #define {} (); <stdio.h> "%d\\n" "%s" '\\0' &&ok; ||done; x<<=1; y>>=2; ~mask; size_t; uint8_t; NULL;`),
    },
    quotes: [
      'int main(void) { printf("Just Type\\n"); return 0; }',
      'for (int i = 0; i < n; i++) { sum += values[i]; }',
      'char *word = strtok(line, " "); while (word != NULL) { word = strtok(NULL, " "); }',
      'int wpm = (correct / 5) * 60 / seconds; printf("WPM: %d\\n", wpm);',
      'pthread_t timer; pthread_create(&timer, NULL, countdown, NULL); pthread_join(timer, NULL);',
      'if (strcmp(input, target) == 0) { score += strlen(target) + 1; }',
      'typedef struct node { int value; struct node *next; } node_t;',
      'FILE *fp = fopen("score.txt", "a"); fprintf(fp, "%d\\n", best); fclose(fp);',
      'int *buffer = malloc(count * sizeof(int)); if (buffer == NULL) { return 1; } free(buffer);',
      'srand(time(NULL)); int pick = rand() % total; puts(texts[pick]);',
    ],
  },
};
