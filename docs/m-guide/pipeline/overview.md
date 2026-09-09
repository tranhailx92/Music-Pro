---
id: PIPE.OVERVIEW
type: pipeline
status: active
version: "1.2"
tags: [pipeline]
serves-steps: [1, 2, 3, 4]
last-updated: "2026-09-08"
---

# Pipeline overview — 4 bước độc lập

```text
Bước 1  meta-prompt
Bước 2  compose-prompt + arrange-prompt (+ DOC_REFS)
Bước 3  MusicXML lead sheet + notes (+ quality gate nội bộ) — một lượt tự động
Bước 4  MusicXML phối khí — một lượt tự động
        ↓ nếu chưa đạt
        Improver → runs/upgrade/ → (merge khi user yêu cầu) → chạy lại
```

Chỉ **bốn** bước chính. Không invent Step 5 (Suno/Udio/vendor) hay path catalog ngoài [`catalog.yml`](../catalog.yml).

## Nguyên tắc

- Mỗi bước **tách được**: làm tay, AI làm, hoặc lấy artifact bước trước.
- Bước 3 và 4 **chạy hết trong một lượt** (không file plan phụ để duyệt giữa chừng) — phù hợp chat web.
- Trong editor: mọi output → `runs/compose/<run-id>/` (xem [runs/README](../../../runs/README.md)).
- Không sửa `docs/m-guide/` khi đang sáng tác.
- Sau Bước 3 hoặc 4, nếu không như ý → chức năng 2b ([improver](../prompts/improver.md)).
- Bước 3: invent giai điệu ([melody-invention](../knowledge/melody/melody-invention.md)); MusicXML hợp lệ ≠ quality PASS.

## Playbook từng bước

| Bước | File |
|------|------|
| 1 | [step-01-meta-prompt.md](step-01-meta-prompt.md) |
| 2 | [step-02-specialized-prompts.md](step-02-specialized-prompts.md) |
| 3 | [step-03-compose.md](step-03-compose.md) |
| 4 | [step-04-arrange.md](step-04-arrange.md) |
| Merge kho | [merge-policy.md](merge-policy.md) |

## STATUS.md compose (mẫu)

```markdown
# Compose STATUS
- run_id: YYYY-MM-DD-slug
- song_request: "..."
- reference_style_id: STYLE....
- step1: pending|done|skipped
- step2: pending|done|skipped
- step3: pending|done|skipped
- step3_gate: pending|PASS|FAIL
- step4: pending|done|skipped
- notes: ...
```

Cập nhật STATUS cho khớp artifact thật. Không đánh dấu step3 done khi gate FAIL.
