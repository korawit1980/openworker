# AGENTS.md

ไฟล์นี้กำหนดแนวทางสำหรับ AI coding agents ที่ทำงานใน OpenWorker repository
และมีผลกับทุกไฟล์ภายใต้ repository root เว้นแต่มี `AGENTS.md` ที่อยู่ลึกกว่า
และกำหนดกติกาเฉพาะส่วนนั้น

## 1. เป้าหมายของการพัฒนา

OpenWorker เป็น local-first, provider-agnostic AI coworker ที่ต้องส่งมอบงานจริง
พร้อมให้ผู้ใช้ควบคุมการกระทำที่มีผลกระทบ ทุกการเปลี่ยนแปลงต้องรักษาหลักต่อไปนี้:

1. ผลลัพธ์ต้องช่วยให้ผู้ใช้ทำงานเสร็จ ไม่ใช่เพิ่มขั้นตอนที่ไม่จำเป็น
2. ข้อมูลและ credentials ของผู้ใช้ต้องอยู่ในเครื่องเมื่อไม่มีเหตุผลให้ส่งออก
3. การกระทำที่มีผลกระทบต้องผ่าน permission/approval flow
4. ฟีเจอร์ทั่วไปต้องไม่ผูกกับ model provider หรือ connector รายเดียวโดยไม่จำเป็น
5. browser UI และ Tauri desktop app ใช้ client codebase เดียวกันและต้องทำงานสอดคล้องกัน
6. Windows และ macOS เป็น desktop targets หลัก; อย่าใช้ path หรือ process assumption
   ที่ทำให้ OS ใด OS หนึ่งเสียโดยไม่มีเหตุผลและการทดสอบรองรับ

อ่าน `project_context.md` และ `README.md` ก่อนเปลี่ยน architecture, setup,
security-sensitive behavior หรือ user-facing workflow

## 2. ขั้นตอนก่อนเริ่มแก้ไข

ทุกงานควรเริ่มด้วยการ:

1. อ่านคำขอของผู้ใช้และจำกัดขอบเขตให้ชัด
2. ตรวจ `git status --short` และรักษาการแก้ไขเดิมของผู้ใช้
3. ค้นหา implementation, tests และ call sites ที่เกี่ยวข้องก่อนแก้
4. อ่าน config/schema/types ที่เป็น boundary ระหว่าง component
5. เลือก targeted tests ที่ตรวจพฤติกรรมดังกล่าวได้

ใช้ `rg` หรือ `rg --files` เป็นตัวเลือกแรกสำหรับค้นหา ห้ามแก้ unrelated files
เพียงเพื่อจัดรูปแบบหรือ refactor ระหว่างทำงานคนละเรื่อง

## 3. ขอบเขตของแต่ละส่วน

### Python backend: `coworker/`

- `server/` ดูแล HTTP/WebSocket API และ lifecycle ของ session
- `agent.py`, `engine.py` และ session modules ดูแล agent loop และ orchestration
- `providers/` ดูแล model-specific behavior และ capability differences
- `tools/` ดูแล local tools และ risk/permission interaction
- `connectors/` และ `mcp/` ดูแล external services, accounts, OAuth และ tools
- `automation/`, `unattended.py`, `inbox.py` ดูแลงานที่ไม่มีผู้ใช้นั่งเฝ้า
- `memory/`, `conversations.py`, `secrets.py` ดูแลข้อมูลที่ persist ในเครื่อง

อย่าใส่ provider-specific branches ใน core engine หากแก้ผ่าน adapter หรือ
capability matrix ได้ อย่าให้ connector implementation ข้าม permission layer

### React/Vite UI: `surfaces/gui/src/`

- ใช้ TypeScript และ types ที่ชัดเจนสำหรับ API/events
- รักษาการทำงานทั้ง browser development mode และ Tauri mode
- แยก presentational behavior ออกจาก API/transport เมื่อทำได้
- เพิ่มหรือแก้ Vitest tests สำหรับ logic และ component behavior
- เมื่อ schema ของ server เปลี่ยน ต้องแก้ client types, parsing และ E2E mocks พร้อมกัน

### Tauri shell: `surfaces/gui/src-tauri/`

- รับผิดชอบ native window, app lifecycle, sidecar supervision และ OS integration
- หลีกเลี่ยงการย้าย product logic จาก Python/TypeScript เข้ามาใน Rust โดยไม่จำเป็น
- ตรวจ parent/child process cleanup บนทั้ง Windows และ POSIX
- ห้าม persist in-memory launch token ของ desktop app ลง disk

### Speech-to-text: `stt/`

- รักษา Rust crate ให้ build แยกได้
- แยก error handling ของ device/model ออกจาก UI-facing contract
- ตรวจ `cargo test` หรืออย่างน้อย `cargo check` เมื่อแก้ส่วนนี้

### Packaging: `packaging/`

- `build_windows.ps1` และ `build_dmg.sh` เป็น release-critical
- ห้ามแก้ signing, notarization, updater หรือ release credentials โดยคาดเดา
- อย่า commit binary artifacts, private certificates, API keys หรือ generated secrets
- หากเปลี่ยน sidecar dependencies ให้ตรวจ PyInstaller hidden imports/data files

## 4. Security, Privacy และ Permissions

ข้อกำหนดเหล่านี้เป็น invariant:

- ห้าม hard-code หรือ commit API keys, OAuth tokens, cookies, passwords และ secrets
- ห้าม log authorization headers, full tokens หรือข้อมูลผู้ใช้ที่ไม่จำเป็น
- ห้าม bypass approval เพื่อให้ workflow สั้นลงหรือทำให้ test ผ่าน
- writes, sends, mutations และ risky shell commands ต้องผ่าน risk/permission system
- unattended runs ต้อง park approval requests แทนการ auto-approve
- validate workspace roots และ resolved paths ก่อน file mutation
- ป้องกัน path traversal และหลีกเลี่ยงการทำงานนอก workspace โดยไม่ขอสิทธิ์
- server default ต้องอยู่บน `127.0.0.1`; การเปิดรับ external interfaces ต้องเป็น
  explicit configuration
- standalone server API ต้องใช้ per-launch token และ desktop token ต้องคงอยู่
  ในหน่วยความจำ
- OAuth callback, MCP server และ connector input ถือเป็นข้อมูลที่ไม่เชื่อถือ
  ต้อง validate ก่อนใช้

เมื่อแก้ส่วน security-sensitive ให้เพิ่ม regression test ที่แสดงทั้งกรณีอนุญาต
และกรณีปฏิเสธ

## 5. Compatibility และ Contracts

- repository นี้เป็น fork `korawit1980/openworker` และเริ่ม release line ที่ `0.1.0`
- desktop identifier คือ `io.github.korawit1980.openworker`; ห้ามเปลี่ยนกลับไปใช้
  identifier หรือ updater endpoint ของ upstream
- `surfaces/gui/src-tauri/tauri.conf.json` เป็น source of truth ของ release version
  และต้อง sync first-party versions ใน `pyproject.toml`, `coworker/__init__.py`,
  `surfaces/gui/package.json`, package lock และ Rust manifests ที่เกี่ยวข้อง
- release tag ต้องตรงกับ Tauri version เช่น `v0.1.0`
- auto-update release ต้องใช้ signing key ที่ fork เป็นเจ้าของ ห้ามใช้หรือ commit
  upstream/private signing keys
- Python ขั้นต่ำคือ 3.10; CI ใช้ Python 3.12
- Node.js ขั้นต่ำคือ 20
- GUI ใช้ React 18, TypeScript, Vite และ Tauri 2
- รองรับ Windows 10/11 x64 และ macOS 12+ Apple Silicon อย่างเป็นทางการ
- ใช้ `pathlib.Path` และ OS-aware APIs แทนการต่อ path ด้วย string
- อย่าสมมติว่า executable ลงท้ายเหมือนกันบนทุก OS
- รักษา backward compatibility ของ config, persisted SQLite data, sessions,
  conversations, automations และ connector account records
- หากจำเป็นต้องเปลี่ยน persisted schema ให้มี migration และ test
- API และ WebSocket event changes ต้องประสาน server, client และ mocks
- เพิ่ม provider/connector ใหม่ผ่าน registry, descriptor และ capability mechanisms
  ที่มีอยู่ แทนการสร้างเส้นทางพิเศษใน UI หรือ engine

## 6. แนวทางการแก้ไขโค้ด

- ทำการเปลี่ยนแปลงที่เล็กที่สุดซึ่งแก้ root cause ได้ครบ
- รักษารูปแบบและ naming ของไฟล์ใกล้เคียง
- เพิ่ม comments เฉพาะเหตุผลหรือ constraint ที่โค้ดบอกเองไม่ได้
- ห้ามกลืน exception แบบกว้างโดยไม่มี fallback หรือ observability ที่เหมาะสม
- error ที่ผู้ใช้แก้ได้ควรมีข้อความที่ชัดเจน แต่ต้องไม่เปิดเผย secret
- หลีกเลี่ยง dependency ใหม่ หาก standard library หรือ dependency เดิมทำได้ดีพอ
- เมื่อเพิ่ม dependency ให้แก้ manifest และ lockfile ที่เกี่ยวข้อง พร้อมอธิบายเหตุผล
- อย่าแก้ generated files ด้วยมือ เว้นแต่ workflow ของโครงการกำหนด
- อย่าเปลี่ยน public behavior โดยไม่เพิ่มหรือปรับ tests และเอกสารที่เกี่ยวข้อง

หากพบ bug ที่อยู่นอกขอบเขต ให้รายงานแยก อย่าขยายงานเองจนกลายเป็น refactor ใหญ่

## 7. Testing Strategy

เริ่มจาก tests ที่แคบที่สุด แล้วขยายตามผลกระทบ

### Python

ติดตั้ง development dependencies:

```bash
python -m pip install -e ".[messaging,dev]"
```

รัน targeted test:

```bash
pytest tests/test_relevant_area.py -q
```

รัน backend suite:

```bash
pytest tests -q
```

ทุก bug fix ควรมี regression test ที่ fail ก่อนแก้และ pass หลังแก้ หากไม่สามารถ
เพิ่ม test ได้ ให้บันทึกเหตุผลในสรุปงาน

### GUI

จาก `surfaces/gui/`:

```bash
npm ci
npx tsc --noEmit
npm test
npm run e2e
```

ใช้ `npm ci` สำหรับ clean/CI verification และใช้ `npm install` เฉพาะเมื่อพัฒนา
หรือเปลี่ยน dependencies

`npm run e2e` เป็น hermetic Playwright suite และควรรันเมื่อแก้ user flow,
API mocks หรือ WebSocket behavior ห้ามรัน `e2e-live` โดยอัตโนมัติ เพราะอาจใช้
credentials, model calls หรือ external services จริง

### Rust

```bash
cargo test --manifest-path stt/Cargo.toml
cargo check --manifest-path surfaces/gui/src-tauri/Cargo.toml
```

เมื่อแก้ native lifecycle, packaging หรือ sidecar behavior ให้ตรวจบน target OS
ที่เกี่ยวข้องหาก environment รองรับ และระบุ OS ที่ยังไม่ได้ตรวจ

### เลือกชุดทดสอบตามขอบเขต

| การเปลี่ยนแปลง | การตรวจขั้นต่ำ |
| --- | --- |
| Python logic | targeted pytest |
| API/event contract | targeted pytest + TypeScript check + GUI test ที่เกี่ยวข้อง |
| React component/logic | TypeScript check + targeted/full Vitest |
| User journey | Vitest + hermetic Playwright E2E |
| Tauri/Rust | cargo check/test + frontend build ที่เกี่ยวข้อง |
| Provider/connector | unit tests ด้วย fakes/mocks; หลีกเลี่ยง live API |
| Packaging | syntax/build check บน target OS เมื่อทำได้ |
| Dependency change | tests ของ component + lockfile consistency |

ก่อนส่งมอบงานที่กระทบหลาย component ให้พยายามรัน checks เดียวกับ
`.github/workflows/ci.yml` หากเวลาและ environment อนุญาต

## 8. การใช้ External Services ใน Tests

- tests ปกติต้อง deterministic และไม่ต้องใช้ network หรือ credentials
- ใช้ fake connectors, mocked model responses และ hermetic API/WS fixtures
- ห้ามส่ง email, Slack message, calendar mutation หรือ GitHub mutation จริง
  เว้นแต่ผู้ใช้สั่งอย่างชัดเจนและระบุ test account
- ห้ามใช้ production credentials ใน test fixtures หรือ snapshots
- network failure, rate limit และ provider error ควรมี mocked regression cases

## 9. UX และ Documentation

- รักษาภาษาที่อธิบาย outcome, approval และ error ให้ตรงกันทั้ง UI และ docs
- การเพิ่ม setting, permission mode, provider หรือ connector ต้องมีข้อความช่วยเหลือ
  และ default ที่ปลอดภัย
- การเปลี่ยน UI ที่มองเห็นได้ควรมี screenshots ตามแนวทางใน `README.md`
- อัปเดต `README.md`, `project_context.md` หรือ config example เมื่อ setup,
  OS support, architecture, command หรือ user workflow เปลี่ยน
- อย่าอ้างว่ารองรับ OS/provider/feature หากไม่มี implementation และ tests รองรับ

## 10. Git และขอบเขตการเปลี่ยนแปลง

- ตรวจและรักษา uncommitted changes ของผู้ใช้
- ห้ามใช้ `git reset --hard`, `git clean -fd` หรือคำสั่งทำลายข้อมูล
- ห้าม revert งานของผู้อื่นเพื่อให้ patch ของตนเองผ่าน
- ห้ามรวม build output, virtual environments, local state หรือ secrets
- ก่อนสรุปงานให้ตรวจ `git diff --check` และ `git status --short`
- ระบุไฟล์ที่แก้ tests ที่รัน และ checks ที่ยังไม่ได้รันอย่างตรงไปตรงมา

### Automatic commit and push

ผู้ใช้อนุญาตให้ commit และ push งานที่ agent แก้ไขใน repository นี้โดยอัตโนมัติ
จึงไม่ต้องรอคำสั่งหรือขออนุมัติซ้ำในแต่ละงาน หลังการปรับปรุง เพิ่มเติม หรือแก้ไข:

1. ตรวจ diff และรัน tests/checks ตามระดับผลกระทบ
2. stage เฉพาะไฟล์ที่เป็นส่วนหนึ่งของงานปัจจุบัน ห้ามรวม unrelated changes
3. สร้าง commit message ที่กระชับและอธิบายผลลัพธ์
4. push current branch ไปยัง configured upstream ทันที
5. รายงาน commit hash, branch และผลการ push ในสรุปงาน

ห้าม force-push, เปลี่ยน remote, ลบ branch หรือ rewrite history โดยไม่ได้รับคำสั่ง
เฉพาะเจาะจง หาก tests ล้มเหลว, ไม่สามารถแยกไฟล์ของผู้ใช้ออกจากงานได้, upstream
diverge หรือ push ถูกปฏิเสธ ให้รักษางานไว้ในเครื่องและรายงาน blocker แทนการใช้
คำสั่งที่เสี่ยงต่อการสูญหายของข้อมูล

## 11. Definition of Done

งานถือว่าเสร็จเมื่อ:

1. แก้ปัญหาตามขอบเขตและไม่เปลี่ยน behavior ที่ไม่เกี่ยวข้อง
2. รักษา local-first, provider-agnostic และ approval invariants
3. เพิ่มหรือปรับ tests ให้ครอบคลุม behavior ใหม่
4. targeted tests ผ่าน และ broader checks ผ่านตามระดับผลกระทบ
5. API/types/mocks/config/docs ที่เกี่ยวข้องสอดคล้องกัน
6. ไม่มี secrets, debug logging หรือ generated artifacts หลุดเข้า diff
7. `git diff --check` ไม่พบ whitespace errors
8. commit และ push งานไปยัง upstream ของ current branch สำเร็จ
9. สรุปผลพร้อมข้อจำกัดหรือสิ่งที่ยังไม่ได้ตรวจให้ผู้ใช้ทราบ

## 12. แหล่งข้อมูลที่ต้องยึด

เมื่อเอกสารขัดกัน ให้ตรวจ implementation และใช้ลำดับอ้างอิงดังนี้:

1. คำสั่งล่าสุดจากผู้ใช้
2. `AGENTS.md` ที่อยู่ใกล้ไฟล์เป้าหมายที่สุด
3. root `AGENTS.md` นี้ เมื่อไม่มีคำสั่งที่เฉพาะกว่า
4. tests และ CI ที่บังคับใช้จริง
5. source code และ manifests
6. `project_context.md` และ `README.md`

หากความขัดแย้งมีผลต่อ security, persisted data, release หรือ public API
ให้หยุดและขอคำยืนยันก่อนเลือกแนวทางที่ย้อนกลับได้ยาก
