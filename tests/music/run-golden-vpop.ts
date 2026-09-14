import { prepareComposition, generateLeadSheet, generateArrangement } from '../../server/music/composer';

const idea = `Một ca khúc V-Pop Ballad bằng tiếng Việt về nỗi nhớ nhà của một người đi xa.

Không khí sâu lắng, ấm áp và giàu cảm xúc, không bi lụy. Hình ảnh chính gồm con đường nhỏ về nhà, hàng cau, vườn cây, cơn mưa và dáng người cha đã hao gầy theo năm tháng nhưng vẫn lặng lẽ chăm sóc khu vườn cho con cháu.

Bài hát cần có lời tiếng Việt tự nhiên, dễ hát, giàu hình ảnh nhưng không sáo rỗng. Điệp khúc phải dễ nhớ, có một câu hook rõ ràng về cảm giác “bình yên là được trở về nhà”.

Giai điệu trữ tình, có cao trào rõ ở điệp khúc. Hòa âm hiện đại theo phong cách V-Pop Ballad. Phối khí tinh tế, ưu tiên piano, strings, acoustic guitar và rhythm section nhẹ.`;

const run = async () => {
  try {
    console.log("1. Prepare");
    const step2 = await prepareComposition(idea, "STYLE.VN.VPOP-BALLAD");
    
    const fs = await import('fs');
    fs.writeFileSync('golden-01-vpop-step1-2.json', JSON.stringify({
      songRequest: step2.songRequest,
      metaPlan: step2.metaPlan,
      planSummary: step2.planSummary,
      composePrompt: step2.composePrompt,
      arrangePrompt: step2.arrangePrompt,
      composeDocRefs: step2.composeDocRefs,
      arrangeDocRefs: step2.arrangeDocRefs,
    }, null, 2));

    console.log("2. Lead Sheet");
    const lead = await generateLeadSheet(step2.composePrompt, step2.composeDocRefs, step2.metaPlan, step2.songRequest, step2.style.id);
    fs.writeFileSync('golden-01-vpop-lead.musicxml', lead);

    console.log("3. Arrangement");
    const arranged = await generateArrangement(lead, step2.arrangePrompt, step2.arrangeDocRefs, step2.songRequest, step2.style.id);
    fs.writeFileSync('golden-01-vpop-arranged.musicxml', arranged);

    console.log("Done");
  } catch(e) {
    console.error(e);
  }
};

run();
