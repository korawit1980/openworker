# Project Context: OpenWorker

เอกสารนี้สรุปบริบทของ OpenWorker สำหรับนักพัฒนาและ AI agent ที่เข้ามาศึกษา
แก้ไข หรือพัฒนา repository นี้ต่อ โดยรายละเอียดเชิงคำสั่งที่อาจเปลี่ยนแปลงได้ให้ยึด
`README.md`, `pyproject.toml`, `surfaces/gui/package.json` และ CI workflow เป็นหลัก

## 1. ภาพรวม

OpenWorker คือแอป AI coworker แบบโอเพนซอร์สที่ทำงานบนเดสก์ท็อป เป้าหมายคือ
ทำงานให้เสร็จเป็นผลลัพธ์ที่ใช้งานได้จริง ไม่ได้หยุดอยู่เพียงการสนทนาหรือแนะนำ
รายการสิ่งที่ผู้ใช้ต้องทำ

ตัวอย่างงาน:

- สร้างเอกสาร รายงาน สเปรดชีต และเว็บเพจ
- อ่าน ค้นหา สร้าง และแก้ไขไฟล์ภายใน workspace
- ใช้ Terminal และ Git ภายใต้ระบบสิทธิ์และการอนุมัติ
- ทำงานกับ Slack, Gmail, GitHub, Jira, Notion, Calendar และบริการอื่นผ่าน
  connectors หรือ MCP
- ตั้ง automation สำหรับรายงานประจำวัน งานประจำสัปดาห์ หรือการติดตามเหตุการณ์
- ขออนุมัติก่อนส่งข้อความ เปลี่ยนข้อมูลภายนอก หรือรันคำสั่งที่มีผลกระทบ

โครงการอยู่ในสถานะ Open Beta และใช้สัญญาอนุญาต MIT

## 2. หลักการสำคัญของผลิตภัณฑ์

### Finished work

ผลลัพธ์หลักควรเป็นชิ้นงานที่ผู้ใช้เปิด ตรวจสอบ และนำไปใช้ต่อได้ เช่น ไฟล์รายงาน
ข้อความตอบกลับที่มีข้อมูลครบ หรือปฏิทินที่ได้รับการจัดระเบียบแล้ว

### Local-first

agent loop, บทสนทนา, connector tokens และ model keys อยู่ในเครื่องของผู้ใช้
ข้อมูลออกจากเครื่องเฉพาะเมื่อจำเป็นต้องส่งไปยัง model provider หรือ integration
ที่ผู้ใช้เลือก การเชื่อม OAuth บางประเภทอาจผ่านบริการ broker ขนาดเล็กของโครงการ

### Provider-agnostic

ผู้ใช้เลือกและเปลี่ยนผู้ให้บริการโมเดลได้ ไม่ควรออกแบบฟีเจอร์ให้ผูกกับ provider
เดียวโดยไม่จำเป็น ผู้ให้บริการที่รองรับมี OpenAI, Anthropic, Google Gemini,
Inkling, GLM, DeepSeek, Kimi, Qwen, MiniMax, Mistral, Grok, Together,
Fireworks และโมเดล local ผ่าน Ollama

### Approval before consequential actions

การเขียนหรือส่งข้อมูลไปยังระบบภายนอก รวมถึงคำสั่ง shell ที่มีความเสี่ยง
ต้องผ่าน permission และ approval flow งานแบบ unattended ต้องพักคำขออนุมัติไว้ใน
inbox แทนการตัดสินใจแทนผู้ใช้

## 3. ระบบปฏิบัติการที่รองรับ

| ระบบปฏิบัติการ | การรองรับอย่างเป็นทางการ | หมายเหตุ |
| --- | --- | --- |
| Windows 10/11 x64 | มีตัวติดตั้ง | สร้าง `.exe`/NSIS และ MSI; README ระบุว่า build อาจยังไม่ code-sign จึงอาจพบ SmartScreen |
| macOS 12+ Apple Silicon | มีตัวติดตั้ง | ใช้ `.dmg`, signed/notarized และรองรับ auto-update |
| Linux | ยังไม่มีตัวติดตั้ง desktop อย่างเป็นทางการ | Python server และ browser UI สามารถทดลองรันจาก source ได้ แต่ repository ไม่มี Linux packaging script |

## 4. ภาษาหลักและเทคโนโลยี

| ส่วน | ภาษา/เทคโนโลยี | หน้าที่ |
| --- | --- | --- |
| Backend | Python 3.10+, FastAPI, Uvicorn, aisuite | agent engine, API, tools, providers, connectors, permissions, memory และ automations |
| Web/Desktop UI | TypeScript, React 18, Vite, Tailwind CSS | หน้าจอสนทนา การตั้งค่า approval stream และการจัดการ integrations |
| Desktop shell | Rust, Tauri 2 | ห่อ React UI เป็น native desktop app และควบคุม Python sidecar |
| Voice input | Rust | speech-to-text sidecar ใน `stt/` |
| GUI tests | Vitest, Testing Library, Playwright | unit tests และ hermetic end-to-end tests |
| Packaging | Bash, PowerShell, PyInstaller | bootstrap และสร้างตัวติดตั้ง macOS/Windows |
| Configuration | TOML, JSON, YAML | Python/Rust packages, Tauri, personas และ application config |

## 5. สถาปัตยกรรมและลำดับการทำงาน

```text
ผู้ใช้
  |
  v
React UI ใน browser หรือ Tauri desktop shell
  |
  | HTTP API + WebSocket events/approvals
  v
Local Python agent server (FastAPI)
  |
  +--> model provider ที่ผู้ใช้เลือก
  +--> local files / terminal / Git
  +--> built-in tools และ MCP tools
  +--> connectors ไปยังบริการภายนอก
  +--> memory / conversations / automations
  |
  v
ผลลัพธ์ที่เสร็จสมบูรณ์ + transcript + approval audit
```

ขั้นตอนระดับผลิตภัณฑ์:

1. ผู้ใช้ระบุผลลัพธ์ที่ต้องการ
2. agent วางแผนหรือแบ่งงานเป็นขั้นตอนตาม mode ที่เลือก
3. agent เรียกใช้เครื่องมือในเครื่อง โมเดล และ integrations ตามความจำเป็น
4. การกระทำที่มีผลกระทบต้องหยุดรอการอนุมัติหรือคำสั่งแก้ไขจากผู้ใช้
5. ระบบส่งมอบผลลัพธ์ที่ใช้งานได้ พร้อมเหตุการณ์และ transcript ที่เกี่ยวข้อง

Standalone server สร้าง launch token แยกตาม port ไว้ใน state directory และ client
ต้องส่ง token ใน `X-OpenWorker-Token` ส่วน desktop shell ใช้ token ในหน่วยความจำ
และไม่เขียน token นั้นลง disk

## 6. โครงสร้าง Repository

| Path | ความรับผิดชอบ |
| --- | --- |
| `coworker/` | Python backend และ runtime หลัก |
| `coworker/server/` | FastAPI application, session manager และ server entry point |
| `coworker/providers/` | adapters และ capability matrix ของ model providers |
| `coworker/tools/` | file, shell, Git, search, plan, todo และ agent tools |
| `coworker/connectors/` | integrations, accounts, credentials และ messaging gateways |
| `coworker/mcp/` | MCP client, OAuth, config และ tool exposure |
| `coworker/automation/` | scheduler, models และ persistence ของงานตามเวลา |
| `coworker/memory/` | memory abstraction และ SQLite store |
| `coworker/personas/` | persona manifests และ registry |
| `surfaces/gui/` | React/Vite UI และ Tauri desktop shell |
| `surfaces/gui/src/` | TypeScript/React application |
| `surfaces/gui/src-tauri/` | Rust/Tauri native layer และ app configuration |
| `surfaces/gui/e2e/` | hermetic Playwright E2E tests ที่ mock API/WS |
| `surfaces/gui/e2e-live/` | tests ที่ใช้ server หรือ integration จริง |
| `stt/` | Rust speech-to-text sidecar |
| `tests/` | Python backend test suite |
| `packaging/` | bootstrap, PyInstaller spec และ macOS/Windows release builds |
| `.github/workflows/` | CI และ release workflows |
| `docs/` | configuration example และ project assets |

Python command-line entry points ที่ประกาศใน `pyproject.toml`:

- `openworker`
- `openworker-server`
- `openworker-connectors`

## 7. การติดตั้งสำหรับผู้ใช้ทั่วไป

### Windows

1. ดาวน์โหลดจาก `https://download.openworker.com/windows`
2. เปิดตัวติดตั้งและตรวจสอบแหล่งที่มาก่อนยืนยัน SmartScreen หากระบบเตือน
3. เปิด OpenWorker
4. เพิ่ม model API key ใน Settings หรือกำหนด endpoint ของ Ollama
5. เชื่อม integrations เฉพาะที่ต้องการใช้งาน

### macOS

1. ใช้ Mac แบบ Apple Silicon และ macOS 12 ขึ้นไป
2. ดาวน์โหลดจาก `https://download.openworker.com/mac`
3. เปิด `.dmg` และลาก OpenWorker ไปยัง Applications
4. เปิดแอปและตั้งค่า model provider หรือ Ollama

ห้าม commit API keys, OAuth tokens, connector credentials หรือไฟล์ state
ส่วนตัวลง repository

## 8. การติดตั้งจาก Source

สิ่งที่ต้องมี:

- Git
- Python 3.10 ขึ้นไป
- Node.js 20 ขึ้นไป
- Rust toolchain ผ่าน `rustup` เมื่อต้องการรันหรือ build Tauri desktop app

### Bootstrap ตาม repository

บน macOS/Linux หรือ Windows ผ่าน Git Bash/WSL:

```bash
bash packaging/setup_dev_env.sh
```

สคริปต์สร้าง virtual environment ที่ `.venv` และติดตั้ง Python package แบบ editable
พร้อม dependencies สำหรับ messaging และ development

PowerShell ทางเลือกสำหรับ Python environment บน Windows:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -e ".[messaging,dev]"
```

### รันแบบ Browser UI

Terminal แรก เริ่ม local server:

```bash
.venv/bin/openworker-server --cwd /path/to/project --port 8765
```

บน Windows PowerShell:

```powershell
.\.venv\Scripts\openworker-server.exe --cwd D:\path\to\project --port 8765
```

Terminal ที่สอง เริ่ม GUI:

```bash
cd surfaces/gui
npm install
npm run dev
```

Vite ใช้ `http://localhost:5173` โดยปกติ และติดต่อ server ที่
`http://127.0.0.1:8765` สามารถ override ด้วย `VITE_COWORKER_HTTP` และ
`VITE_COWORKER_WS`

### รันแบบ Desktop App

หลังจาก bootstrap Python environment และติดตั้ง Rust แล้ว:

```bash
cd surfaces/gui
npm install
npm run tauri dev
```

Tauri shell จะเปิด native window และดูแล Python server sidecar ให้เอง

## 9. Configuration

ตำแหน่ง config:

- Global: `~/.config/coworker/config.toml`
- Workspace: `<project>/.coworker/config.toml`

Workspace config override global config ค่าหลักประกอบด้วย model, permission mode,
จำนวน tool iterations, allowed command prefixes, auto-allowed tools, host และ port
ตัวอย่างอยู่ที่ `docs/config.example.toml`

Mode ที่ server รองรับในปัจจุบัน:

- `discuss`
- `plan`
- `interactive`
- `auto`

ควร bind server กับ loopback (`127.0.0.1`) ตามค่าเริ่มต้น เว้นแต่ผู้ใช้เข้าใจ
ผลกระทบด้านความปลอดภัยและตั้งใจเปลี่ยนเอง

## 10. คำสั่งพัฒนาและทดสอบ

Python:

```bash
pytest tests -q
```

หรือรันเฉพาะไฟล์ที่เกี่ยวข้องระหว่างพัฒนา:

```bash
pytest tests/test_server.py -q
```

GUI:

```bash
cd surfaces/gui
npm ci
npm test
npx tsc --noEmit
npm run e2e
```

`npm run e2e` เป็น hermetic E2E ที่ mock `/v1` และ WebSocket ไม่ต้องใช้ model key
หรือ Python server ส่วน `e2e-live` อาจต้องใช้ server, credentials หรือ external
services จริง จึงไม่ควรรันโดยอัตโนมัติ

Rust:

```bash
cargo test --manifest-path stt/Cargo.toml
cargo check --manifest-path surfaces/gui/src-tauri/Cargo.toml
```

CI ปัจจุบันตรวจสามส่วน:

1. Python tests บน Python 3.12
2. GUI unit tests บน Node.js 20
3. Playwright hermetic E2E ด้วย Chromium

## 11. การ Build ตัวติดตั้ง

- Windows: `packaging/build_windows.ps1`
- macOS: `packaging/build_dmg.sh`

สคริปต์เหล่านี้ build Python sidecar และ Tauri application ก่อนสร้าง installer
ควรใช้บน OS เป้าหมายและอ่าน prerequisite ที่หัวไฟล์ก่อนรัน การทำ release,
code signing, notarization และ auto-update manifest ต้องใช้ credentials
เฉพาะของผู้ดูแลโครงการ

## 12. ข้อจำกัดและข้อควรระวัง

- โครงการยังเป็น Beta จึงต้องให้ความสำคัญกับ backward compatibility และ migration
- Windows installer อาจแสดง SmartScreen warning หาก build ยังไม่ได้ code-sign
- official macOS download รองรับเฉพาะ Apple Silicon
- ยังไม่มี official Linux desktop installer ใน repository
- integrations และ model providers อาจมี API differences ต้องตรวจ capability
  ก่อนแสดงหรือเรียกใช้ feature
- ห้ามลดระดับ permission checks เพื่อทำให้ test หรือ workflow ผ่าน
- ห้ามบันทึก secrets, full authorization headers หรือเนื้อหาส่วนตัวลง log
- การแก้ API/event schema ต้องตรวจทั้ง Python server, TypeScript client และ E2E mocks

## 13. เอกสารอ้างอิงใน Repository

- `README.md` — product overview, downloads, source setup และ layout
- `pyproject.toml` — Python dependencies, extras และ command entry points
- `surfaces/gui/README.md` — browser/desktop development workflow
- `surfaces/gui/package.json` — frontend dependencies และ scripts
- `docs/config.example.toml` — application configuration example
- `.github/workflows/ci.yml` — checks ที่ใช้ใน CI
- `AGENTS.md` — กติกาสำหรับ agent ที่พัฒนา repository นี้
