# Shopify Theme — 設計規範

## 品牌色彩系統

以下是本專案標準品牌色彩，所有 UI 元件必須依此執行：

| 角色 | 色名 | HEX | 用途 |
|------|------|-----|------|
| Primary | Deep Navy | `#1A2E4A` | 標題、按鈕背景、主文字 |
| Secondary | Mountain Blue | `#2D5F8A` | Hover 強調色 |
| Accent | Sky Blue | `#3A7AB5` | Focus 邊框、裝飾線、CTA |
| Highlight | Ice Blue | `#7AB3D4` | Hover 邊框輔助 |
| Frost | Frost | `#B8D9ED` | 靜態輸入框邊框、分隔線 |
| Snow White | Snow White | `#E8F4FA` | 輸入框背景、卡片底色 |
| Black | Slope Black | `#111111` | 主文字/LOGO |
| Neutral | Stone Gray | `#5A6A78` | Placeholder、備註文字 |

---

## 表單輸入框設計規範

所有表單（Blog 留言、聯絡我們、任何新增表單）的 input/textarea 必須遵循：

```css
/* 靜態狀態 */
color: #1A2E4A;                /* Deep Navy */
background-color: #E8F4FA;    /* Snow White */
border: 1px solid #B8D9ED;    /* Frost */
border-radius: var(--style-border-radius-inputs);
transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
-webkit-font-smoothing: antialiased;

/* Placeholder */
color: #5A6A78;  /* Stone Gray */
opacity: 1;

/* Hover */
border-color: #7AB3D4;  /* Ice Blue */

/* Focus */
outline: none;
border-color: #3A7AB5;                         /* Sky Blue */
box-shadow: 0 0 0 3px rgba(58, 122, 181, 0.12);
background-color: #ffffff;
```

---

## 表單標題設計規範

表單區塊的 h2/h3 標題，需加入 Sky Blue 左裝飾線：

```css
color: #1A2E4A;           /* Deep Navy */
letter-spacing: 0.04em;
padding-left: 0.875rem;
border-left: 3px solid #3A7AB5;  /* Sky Blue */
margin-bottom: var(--margin-lg, 1.5rem);
```

---

## 提交按鈕設計規範

所有表單的提交按鈕統一使用：

```css
/* 靜態 */
background-color: #1A2E4A;  /* Deep Navy */
color: #ffffff;
border-color: #1A2E4A;
transition: background-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;

/* Hover */
background-color: #2D5F8A;  /* Mountain Blue */
border-color: #2D5F8A;
transform: translateY(-1px);
box-shadow: 0 4px 12px rgba(26, 46, 74, 0.2);

/* Active */
transform: translateY(0);
box-shadow: none;
```

---

## 間距規範

- 表單欄位之間：`var(--gap-md)`
- 備註文字（如審核提示）上方：`0.75rem`
- 備註文字（如審核提示）下方：`0.25rem`，`line-height: 1.6`
- 提交按鈕上方：`var(--gap-md)` 或 `var(--comment-form-gap)`
- 表單標題下方 margin：`var(--margin-lg, 1.5rem)`

---

## 狀態訊息規範

```css
/* 成功 / 一般提示 */
background-color: #E8F4FA;  /* Snow White */
border: 1px solid #B8D9ED;  /* Frost */
color: #1A2E4A;              /* Deep Navy */
padding: 0.75rem 1rem;
border-radius: var(--style-border-radius-inputs);

/* 錯誤 */
background-color: #FEF2F2;
border: 1px solid #FECACA;
color: #991B1B;
```

---

## Color Scheme 設定規範

當修改 `config/settings_data.json` 的色彩計畫 input 值時，統一使用：

```json
"input_background":       "#E8F4FA",
"input_text_color":       "#1A2E4A",
"input_border_color":     "#B8D9ED",
"input_hover_background": "#ffffff"
```

---

## 品牌 CSS 變數宣告（各元件 container 層級定義）

```css
--brand-deep-navy:     #1A2E4A;
--brand-mountain-blue: #2D5F8A;
--brand-sky-blue:      #3A7AB5;
--brand-ice-blue:      #7AB3D4;
--brand-frost:         #B8D9ED;
--brand-snow:          #E8F4FA;
--brand-stone-gray:    #5A6A78;
```
