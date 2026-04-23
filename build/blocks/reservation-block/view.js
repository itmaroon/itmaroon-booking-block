/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/blocks/reservation-block/createTableSource.ts"
/*!***********************************************************!*\
  !*** ./src/blocks/reservation-block/createTableSource.ts ***!
  \***********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   buildBookingListTableSource: () => (/* binding */ buildBookingListTableSource),
/* harmony export */   buildCalendarTableSource: () => (/* binding */ buildCalendarTableSource),
/* harmony export */   renderBookingCellHtml: () => (/* binding */ renderBookingCellHtml),
/* harmony export */   renderCancelButtonHtml: () => (/* binding */ renderCancelButtonHtml),
/* harmony export */   renderTableFromTableSource: () => (/* binding */ renderTableFromTableSource)
/* harmony export */ });
/* harmony import */ var itmar_block_packages__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! itmar-block-packages */ "../../node_modules/itmar-block-packages/build/esm/DateElm.js");

// -------------------------
// tableSource -> DOM(tbody) 再描画
// -------------------------
const renderTableFromTableSource = (tableRoot, tableSource) => {
  if (!tableRoot || !Array.isArray(tableSource)) return;
  const table = tableRoot.querySelector("table");
  if (!table) return;
  table.style.width = "100%";
  table.style.tableLayout = "fixed";

  // tbodyは毎回作り直す（残骸対策）
  table.querySelectorAll("tbody").forEach(tb => tb.remove());
  const tbody = document.createElement("tbody");
  table.appendChild(tbody);
  const frag = document.createDocumentFragment();
  for (const row of tableSource) {
    if (!row || !Array.isArray(row.cells)) continue;
    const tr = document.createElement("tr");
    for (const cell of row.cells) {
      const tag = cell?.tag === "th" ? "th" : "td";
      const el = document.createElement(tag);
      const span = document.createElement("span");
      const content = cell?.content;
      //属性を記録する
      if (cell.attributes) {
        Object.entries(cell.attributes).forEach(([key, value]) => {
          // 値が存在する場合のみセット（null や undefined を避ける）
          if (value !== undefined && value !== null) {
            el.setAttribute(key, String(value));
          }
        });
      }
      if (content == null) {
        // noop
      } else if (content instanceof Node) {
        span.appendChild(content);
      } else if (typeof content === "string") {
        // ✅ 今回は常にHTML文字列前提でOK
        span.innerHTML = content;
      } else {
        span.textContent = String(content);
      }
      el.appendChild(span);
      tr.appendChild(el);
    }
    frag.appendChild(tr);
  }
  tbody.appendChild(frag);
};

/**
 * calendar: [{date:number, weekday:number, holiday?:string, slotStatus?, slotCapacity?, slotId?}, ...]
 * renderCell: (dayObj, dayNum) => string|Node|any  // editorならReactNode、viewならHTML文字列
 */
const buildCalendarTableSource = (selectedMonth, calendar, {
  isMonday = false,
  headerFormatter = w => w.charAt(0).toUpperCase() + w.slice(1),
  renderCell
}) => {
  if (!selectedMonth || !Array.isArray(calendar) || calendar.length === 0) return [];
  const {
    year,
    month,
    lastDay
  } = (0,itmar_block_packages__WEBPACK_IMPORTED_MODULE_0__.getMonthRangeYmd)(selectedMonth);
  if (!year || !month || !lastDay) return [];
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0..6

  const areasStr = (0,itmar_block_packages__WEBPACK_IMPORTED_MODULE_0__.generateGridAreas)(firstDayOfMonth, lastDay, isMonday);
  const lines = areasStr.split("\n").map(l => l.replace(/"/g, "").trim()).filter(Boolean);
  const headerTokens = (lines[0] || "").split(/\s+/);
  let weekLines = lines.slice(1);

  // 末尾の不要週（dayN が1つも無い行）を削除
  let lastUseful = -1;
  for (let i = 0; i < weekLines.length; i++) {
    if (/\bday\d+\b/.test(weekLines[i])) lastUseful = i;
  }
  weekLines = lastUseful >= 0 ? weekLines.slice(0, lastUseful + 1) : [];
  const dayMap = new Map(calendar.map(d => [Number(d.date), d]));
  const tableSource = [];

  // header row
  tableSource.push({
    cells: headerTokens.map(w => ({
      tag: "th",
      content: headerFormatter(w)
    }))
  });

  // body rows
  for (const line of weekLines) {
    const tokens = line.split(/\s+/);
    tableSource.push({
      cells: tokens.map(token => {
        const m = token.match(/^day(\d+)$/);
        if (!m) return {
          tag: "td",
          content: ""
        };
        const dayNum = Number(m[1]);
        const foundDay = dayMap.get(dayNum);
        const dayObj = foundDay ? foundDay : {
          date: dayNum,
          weekday: "" // DayObjectで必須なら空文字等で初期化
        };
        return {
          tag: "td",
          // string ではなく "td" 型として明示
          content: renderCell(dayObj, dayNum),
          // ✅ ここに data 属性用のオブジェクトを追加
          attributes: {
            "data-date": dayObj.date,
            "data-slot-id": dayObj.slotId || "",
            "data-capacity": dayObj.slotCapacity || 0,
            "data-status": dayObj.slotStatus || ""
          }
        };
      })
    });
  }
  return tableSource;
};
const buildBookingListTableSource = (bookings, {
  renderActions // キャンセルボタンなどを描画するコールバック
}) => {
  if (!Array.isArray(bookings) || bookings.length === 0) {
    // データがない場合は「予約がありません」という1行を返す
    return [{
      cells: [{
        tag: "td",
        content: "予約データが見つかりません。",
        attributes: {
          colspan: 4
        }
      }]
    }];
  }
  const tableSource = [];

  // データ行
  bookings.forEach(booking => {
    tableSource.push({
      cells: [{
        tag: "td",
        content: booking.slot_date
      }, {
        tag: "td",
        content: booking.resource_name
      }, {
        tag: "td",
        content: `${booking.guest_count} 名`
      }, {
        tag: "td",
        content: renderActions(booking),
        attributes: {
          "data-booking-id": booking.booking_id,
          "data-status": booking.booking_status
        }
      }]
    });
  });
  return tableSource;
};
const escapeHtml = s => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const renderBookingCellHtml = (dayObj, dayNum) => {
  const status = dayObj?.slotStatus ? escapeHtml(dayObj.slotStatus) : "";
  const cap = Number.isFinite(Number(dayObj?.slotCapacity)) ? Number(dayObj.slotCapacity) : 0;

  // 「holiday」文字は出さない
  const holiday = dayObj?.holiday && dayObj.holiday !== "holiday" ? escapeHtml(dayObj.holiday) : "";
  return `
		<div style="line-height:1.3;">
			<div style="font-weight:600;">${dayNum}</div>
			${status ? `<div style="font-size:12px;opacity:0.9;">Status: ${status}</div>` : ""}
			<div style="font-size:12px;opacity:0.9;">Cap: ${cap}</div>
			${holiday ? `<div style="font-size:12px;opacity:0.9;">★ ${holiday}</div>` : ""}
		</div>
	`.trim();
};
const renderCancelButtonHtml = booking => {
  // 既にキャンセル済みの場合はボタンを出さない、または無効化する
  if (booking.booking_status === "cancelled") {
    return `<span style="color: #999;">キャンセル済み</span>`;
  }
  return `
        <button 
            type="button" 
            class="itmar-cancel-button" 
            style="background:#e53935; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;"
        >
            キャンセル
        </button>
    `.trim();
};

/***/ },

/***/ "../../node_modules/itmar-block-packages/build/esm/DateElm.js"
/*!********************************************************************!*\
  !*** ../../node_modules/itmar-block-packages/build/esm/DateElm.js ***!
  \********************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   PeriodCtrl: () => (/* binding */ PeriodCtrl),
/* harmony export */   generateDateArray: () => (/* binding */ generateDateArray),
/* harmony export */   generateGridAreas: () => (/* binding */ generateGridAreas),
/* harmony export */   generateMonthCalendar: () => (/* binding */ generateMonthCalendar),
/* harmony export */   getMonthRangeYmd: () => (/* binding */ getMonthRangeYmd),
/* harmony export */   getPeriodQuery: () => (/* binding */ getPeriodQuery),
/* harmony export */   getTodayMonth: () => (/* binding */ getTodayMonth),
/* harmony export */   getTodayYear: () => (/* binding */ getTodayYear),
/* harmony export */   getTodayYearMonth: () => (/* binding */ getTodayYearMonth),
/* harmony export */   normalizeDateYYYYMMDD: () => (/* binding */ normalizeDateYYYYMMDD),
/* harmony export */   toYmdFromMonthAndDay: () => (/* binding */ toYmdFromMonthAndDay)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var nanoid_non_secure__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! nanoid/non-secure */ "../../node_modules/nanoid/non-secure/index.js");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__);





//期間の設定から選択できる月の情報オブジェクトを配列にする関数
const generateDateArray = (dateObj, isMonth) => {
    const { startYear, startMonth, endYear, endMonth } = dateObj;
    const result = [];
    for (let year = startYear; year <= endYear; year++) {
        if (isMonth) {
            const monthStart = year === startYear ? startMonth : 1;
            const monthEnd = year === endYear ? endMonth : 12;
            for (let month = monthStart; month <= monthEnd; month++) {
                const unitObj = {
                    id: (0,nanoid_non_secure__WEBPACK_IMPORTED_MODULE_2__.nanoid)(5),
                    value: `${year}/${month.toString().padStart(2, "0")}`,
                    label: `${year}/${month.toString().padStart(2, "0")}`,
                    classname: "filter_date",
                };
                result.push(unitObj);
            }
        }
        else {
            const unitObj = {
                id: (0,nanoid_non_secure__WEBPACK_IMPORTED_MODULE_2__.nanoid)(5),
                value: `${year}`,
                label: `${year}`,
                classname: "filter_date",
            };
            result.push(unitObj);
        }
    }
    return result;
};
const generateMonthCalendar = (dateString, holidays = null) => {
    const [year, month] = dateString.split("/").map(Number);
    const date = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0).getDate();
    // 2. 配列を初期化する際に、その型を指定する
    const calendar = [];
    for (let day = 1; day <= lastDay; day++) {
        date.setDate(day);
        //祝日の情報
        const holidayItem = holidays?.find((item) => {
            const s = String(item.date ?? "");
            // item.date から YYYY, MM, DD を取り出す（"YYYYMMDD" / "YYYY-MM-DD" などに対応）
            const yearStr = s.slice(0, 4);
            const monthStr = s.replace(/\D/g, "").slice(4, 6); // 数字だけにして5-6桁
            const dayStr = s.replace(/\D/g, "").slice(6, 8); // 数字だけにして7-8桁
            const itemYear = Number(yearStr);
            const itemMonth = Number(monthStr);
            const itemDay = Number(dayStr);
            return itemYear === year && itemMonth === month && itemDay === day;
        });
        //日付情報オブジェクト
        const dayObj = holidayItem
            ? {
                date: day,
                weekday: date.getDay(),
                holiday: holidayItem.name,
            }
            : {
                date: day,
                weekday: date.getDay(),
            };
        calendar.push(dayObj);
    }
    return calendar;
};
const PeriodCtrl = ({ startYear, endYear, dateSpan, isMonth, onChange, }) => {
    return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.PanelBody, { title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)("Period Setting", "block-collections"), initialOpen: true, className: "form_setteing_ctrl", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("label", { children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)("Start of period", "block-collections") }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.PanelRow, { className: "itmar_date_span", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.__experimentalNumberControl, { label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)("Year", "block-collections"), labelPosition: "side", max: endYear, min: startYear, onChange: (newValue) => {
                            const newSpanObj = {
                                dateSpan: {
                                    ...dateSpan,
                                    startYear: Number(newValue),
                                },
                            };
                            onChange(newSpanObj);
                        }, value: dateSpan.startYear }), isMonth && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.__experimentalNumberControl, { label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)("Month", "block-collections"), labelPosition: "side", max: 12, min: 1, onChange: (newValue) => {
                            const newSpanObj = {
                                dateSpan: {
                                    ...dateSpan,
                                    startMonth: Number(newValue),
                                },
                            };
                            onChange(newSpanObj);
                        }, value: dateSpan.startMonth }))] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("label", { children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)("End of period", "block-collections") }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.PanelRow, { className: "itmar_date_span", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.__experimentalNumberControl, { label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)("Year", "block-collections"), labelPosition: "side", max: endYear, min: startYear, onChange: (newValue) => {
                            const newSpanObj = {
                                dateSpan: {
                                    ...dateSpan,
                                    endYear: Number(newValue),
                                },
                            };
                            onChange(newSpanObj);
                        }, value: dateSpan.endYear }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.__experimentalNumberControl, { label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)("Month", "block-collections"), labelPosition: "side", max: 12, min: 1, onChange: (newValue) => {
                            const newSpanObj = {
                                dateSpan: {
                                    ...dateSpan,
                                    endMonth: Number(newValue),
                                },
                            };
                            onChange(newSpanObj);
                        }, value: dateSpan.endMonth })] })] }));
};
const getPeriodQuery = (dateString) => {
    if (!dateString) {
        return null; //与えられた文字列が空ならnullをかえす
    }
    const parts = dateString.split("/");
    // 1. 年は必須。取れない場合は null を返す
    const year = parts[0] ? parseInt(parts[0], 10) : null;
    if (year === null || isNaN(year))
        return null;
    // 2. 月と日を「数値」または「undefined」として安全に抽出
    // NaN を避けるために、条件式で厳密にチェックします
    const month = parts.length > 1 && !isNaN(parseInt(parts[1], 10))
        ? parseInt(parts[1], 10)
        : undefined;
    const day = parts.length > 2 && !isNaN(parseInt(parts[2], 10))
        ? parseInt(parts[2], 10)
        : undefined;
    let startDate;
    let endDate;
    // 3. 判定ロジック（undefined を使った方が TS の相性が良いです）
    if (month !== undefined && day !== undefined) {
        startDate = new Date(year, month - 1, day, 0, 0, 0, -1);
        endDate = new Date(year, month - 1, day, 23, 59, 59, 1000);
    }
    else if (month !== undefined) {
        startDate = new Date(year, month - 1, 1, 0, 0, 0, -1);
        endDate = new Date(year, month, 1, 0, 0, 0, 0);
    }
    else {
        startDate = new Date(year, 0, 1, 0, 0, 0, -1);
        endDate = new Date(year + 1, 0, 1, 0, 0, 0, 0);
    }
    return {
        after: startDate.toISOString(),
        before: endDate.toISOString(),
    };
};
//本日の日付から'YYYY/MM'形式の日付文字列を生成する
const getTodayYearMonth = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    return `${year}/${month}`;
};
//本日の日付から年を返す
const getTodayYear = () => {
    const today = new Date();
    return today.getFullYear();
};
//本日の日付から月を返す
const getTodayMonth = () => {
    const today = new Date();
    return today.getMonth() + 1;
};
const pad2 = (n) => String(n).padStart(2, "0");
const getMonthRangeYmd = (selectedMonth) => {
    // 初期値（エラー時や未選択時）
    const defaultRange = {
        ym: "",
        from: "",
        to: "",
        year: 0,
        month: 0,
        lastDay: 0,
    };
    if (!selectedMonth)
        return defaultRange;
    const [yStr, mStr] = String(selectedMonth).split("/");
    const year = Number(yStr);
    const month = Number(mStr);
    // 2. NaN チェックを含めたガード
    if (isNaN(year) || isNaN(month) || year === 0 || month === 0) {
        return defaultRange;
    }
    // その月の「0日目」を指定することで、前月の最終日（＝今月の末日）を取得
    const lastDay = new Date(year, month, 0).getDate();
    const mm = pad2(month);
    return {
        ym: `${year}-${mm}`,
        from: `${year}-${mm}-01`,
        to: `${year}-${mm}-${pad2(lastDay)}`,
        year,
        month,
        lastDay,
    };
};
const normalizeDateYYYYMMDD = (value) => {
    // 期待値: 'YYYY-MM-DD'
    if (!value)
        return "";
    return String(value).slice(0, 10);
};
/**
 * 様々な形式の「日」の入力と「選択された月」を組み合わせて YYYY-MM-DD 形式を返す
 */
const toYmdFromMonthAndDay = (selectedMonth, dayValue) => {
    if (!dayValue)
        return "";
    const dayStr = String(dayValue).trim();
    // already "YYYY-MM-DD"
    if (/^\d{4}-\d{2}-\d{2}$/.test(dayStr))
        return dayStr;
    // 8 digits "YYYYMMDD"
    if (/^\d{8}$/.test(dayStr)) {
        const y = dayStr.slice(0, 4);
        const m = dayStr.slice(4, 6);
        const d = dayStr.slice(6, 8);
        return `${y}-${m}-${d}`;
    }
    // day-of-month number
    const dayNum = Number(dayStr);
    if (!selectedMonth || !dayNum)
        return "";
    const [yStr, mStr] = String(selectedMonth).split("/");
    if (!yStr || !mStr)
        return "";
    return `${yStr}-${pad2(Number(mStr))}-${pad2(dayNum)}`;
};
/* ------------------------------
カレンダー用グリッドAreasの生成関数
------------------------------ */
const WEEK_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
/**
 * カレンダーの grid-template-areas 用の文字列を生成する
 * @param firstDayOfMonth 月の最初の日の曜日番号 (0:日, 1:月...)
 * @param totalDays 月の総日数 (28-31)
 * @param isMonday 月曜始まりにするかどうか
 */
const generateGridAreas = (firstDayOfMonth, totalDays, isMonday) => {
    const areas = [];
    let currentDay = 1;
    //月曜日を先頭に持ってくる場合の係数
    const mondayFirstDay = firstDayOfMonth - 1 < 0 ? 6 : firstDayOfMonth - 1;
    //先頭曜日の選択
    const modifyFirstDay = isMonday ? mondayFirstDay : firstDayOfMonth;
    //曜日ラベル
    const weekLabels = [];
    let week_index;
    for (let i = 0; i < 7; i++) {
        week_index = isMonday ? i + 1 : i; //月曜日を先頭に持ってくる場合の補正
        if (week_index > 6)
            week_index = 0;
        weekLabels.push(WEEK_NAMES[week_index]);
    }
    areas.push(weekLabels.join(" "));
    for (let i = 0; i < 6; i++) {
        // 6週分のループ
        const week = [];
        for (let j = 0; j < 7; j++) {
            // 1週間の7日分のループ
            if ((i === 0 && j < modifyFirstDay) || currentDay > totalDays) {
                week.push(`empty${i}`);
            }
            else {
                week.push(`day${currentDay}`);
                currentDay++;
            }
        }
        if (i == 5) {
            //最後の週
            week[5] = "day_clear";
            week[6] = "day_clear";
        }
        areas.push(week.join(" "));
    }
    return areas.map((week) => `"${week}"`).join("\n");
};


//# sourceMappingURL=DateElm.js.map


/***/ },

/***/ "../../node_modules/itmar-block-packages/build/esm/formatCreate.js"
/*!*************************************************************************!*\
  !*** ../../node_modules/itmar-block-packages/build/esm/formatCreate.js ***!
  \*************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   FormatSelectControl: () => (/* binding */ FormatSelectControl),
/* harmony export */   displayFormated: () => (/* binding */ displayFormated)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_date__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/date */ "@wordpress/date");
/* harmony import */ var _wordpress_date__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_wordpress_date__WEBPACK_IMPORTED_MODULE_3__);





//日付のフォーマット
const dateFormats = [
    { label: "YYYY-MM-DD HH:mm:ss", value: "Y-m-d H:i:s" },
    { label: "MM/DD/YYYY", value: "m/d/Y" },
    { label: "DD/MM/YYYY", value: "d/m/Y" },
    { label: "MMMM D, YYYY", value: "F j, Y" },
    { label: "HH:mm:ss", value: "H:i:s" },
    { label: "YYYY.M.D", value: "Y.n.j" },
    { label: "Day, MMMM D, YYYY", value: "l, F j, Y" },
    { label: "ddd, MMM D, YYYY", value: "D, M j, Y" },
    { label: "YYYY年M月D日 (曜日)", value: "Y年n月j日 (l)" },
];
//プレーンのフォーマット
const plaineFormats = [
    {
        key: "str_free",
        label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)("Free String", "block-collections"),
        value: "%s",
    },
    {
        key: "num_comma",
        label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)("Numbers (comma separated)", "block-collections"),
        value: {
            style: "decimal",
            useGrouping: true, // カンマ区切り
        },
    },
    {
        key: "num_no_comma",
        label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)("Numbers (no commas)", "block-collections"),
        value: {
            style: "decimal",
            useGrouping: false,
        },
    },
    {
        key: "num_amount",
        label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)("Amount", "block-collections"),
        value: {
            style: "currency",
            currency: "JPY",
        },
    },
];
const FormatSelectControl = ({ titleType, userFormat, freeStrFormat, decimal, onFormatChange, }) => {
    const isPlaine = titleType === "plaine";
    const isDate = titleType === "date";
    const isUser = titleType === "user";
    //SelectControlのオプションを生成
    const options = isDate
        ? dateFormats
        : plaineFormats.map((f) => ({ label: f.label, value: f.key }));
    return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelBody, { title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)("Display Format Setting", "block-collections"), children: [(isPlaine || isDate) && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.Fragment, { children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, { label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)("Select Format", "block-collections"), value: userFormat, options: options, onChange: (newFormat) => onFormatChange({
                            userFormat: newFormat,
                            freeStrFormat,
                            decimal,
                        }) }), userFormat?.startsWith("str_") && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, { label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)("String Format", "block-collections"), value: freeStrFormat, onChange: (newFormat) => onFormatChange({
                            userFormat,
                            freeStrFormat: newFormat,
                            decimal,
                        }) })), userFormat?.startsWith("num_") && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, { className: "itmar_post_blocks_pannel", children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.RangeControl, { value: decimal, label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)("Decimal Num", "query-blocks"), max: 5, min: 0, onChange: (val) => onFormatChange({
                                userFormat,
                                freeStrFormat,
                                decimal: val ?? 0,
                            }) }) }))] })), isUser && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, { label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)("User Format", "block-collections"), value: freeStrFormat, onChange: (newFormat) => onFormatChange({
                    userFormat: "str_free",
                    freeStrFormat: newFormat,
                    decimal,
                }) }))] }));
};
/**
 * 値を指定されたフォーマットで整形して返す
 */
const displayFormated = (content, userFormat, freeStrFormat, decimal) => {
    if (content === undefined || content === null)
        return "";
    // 内部で使用するロケール
    const locale = (0,_wordpress_date__WEBPACK_IMPORTED_MODULE_3__.getSettings)().l10n?.locale || "en";
    //日付にフォーマットがあれば、それで書式設定してリターン
    const isDateFormat = dateFormats.find((f) => f.value === userFormat);
    if (isDateFormat && userFormat) {
        // WordPressの format 関数を使用して日付を整形
        return (0,_wordpress_date__WEBPACK_IMPORTED_MODULE_3__.format)(userFormat, content);
    }
    //数値や文字列のフォーマット
    const selectedFormat = plaineFormats.find((f) => f.key === userFormat)?.value;
    if (typeof selectedFormat === "object" && selectedFormat !== null) {
        // Intl.NumberFormat オプション
        try {
            const numeric = typeof content === "number" ? content : parseFloat(content);
            if (isNaN(numeric))
                return String(content);
            // `selectedFormat` を元に新しいフォーマット設定を生成（mutateしない）
            // options を型安全に生成
            const options = { ...selectedFormat };
            if (typeof decimal === "number" && decimal > 0) {
                options.minimumFractionDigits = decimal;
                options.maximumFractionDigits = decimal;
            }
            const formatter = new Intl.NumberFormat(locale, options);
            return formatter.format(numeric);
        }
        catch (e) {
            console.warn("Number format failed:", e);
            return String(content);
        }
    }
    else if (typeof selectedFormat === "string") {
        return freeStrFormat.replace("%s", String(content));
    }
    //フォーマットが見つからないときはそのまま返す
    return content;
};


//# sourceMappingURL=formatCreate.js.map


/***/ },

/***/ "react/jsx-runtime"
/*!**********************************!*\
  !*** external "ReactJSXRuntime" ***!
  \**********************************/
(module) {

module.exports = window["ReactJSXRuntime"];

/***/ },

/***/ "@wordpress/api-fetch"
/*!**********************************!*\
  !*** external ["wp","apiFetch"] ***!
  \**********************************/
(module) {

module.exports = window["wp"]["apiFetch"];

/***/ },

/***/ "@wordpress/components"
/*!************************************!*\
  !*** external ["wp","components"] ***!
  \************************************/
(module) {

module.exports = window["wp"]["components"];

/***/ },

/***/ "@wordpress/date"
/*!******************************!*\
  !*** external ["wp","date"] ***!
  \******************************/
(module) {

module.exports = window["wp"]["date"];

/***/ },

/***/ "@wordpress/i18n"
/*!******************************!*\
  !*** external ["wp","i18n"] ***!
  \******************************/
(module) {

module.exports = window["wp"]["i18n"];

/***/ },

/***/ "../../node_modules/nanoid/non-secure/index.js"
/*!*****************************************************!*\
  !*** ../../node_modules/nanoid/non-secure/index.js ***!
  \*****************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   customAlphabet: () => (/* binding */ customAlphabet),
/* harmony export */   nanoid: () => (/* binding */ nanoid)
/* harmony export */ });
/* @ts-self-types="./index.d.ts" */
let urlAlphabet =
  'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict'
let customAlphabet = (alphabet, defaultSize = 21) => {
  return (size = defaultSize) => {
    let id = ''
    let i = size | 0
    while (i--) {
      id += alphabet[(Math.random() * alphabet.length) | 0]
    }
    return id
  }
}
let nanoid = (size = 21) => {
  let id = ''
  let i = size | 0
  while (i--) {
    id += urlAlphabet[(Math.random() * 64) | 0]
  }
  return id
}


/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		if (!(moduleId in __webpack_modules__)) {
/******/ 			delete __webpack_module_cache__[moduleId];
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!**********************************************!*\
  !*** ./src/blocks/reservation-block/view.ts ***!
  \**********************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/api-fetch */ "@wordpress/api-fetch");
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var itmar_block_packages__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! itmar-block-packages */ "../../node_modules/itmar-block-packages/build/esm/DateElm.js");
/* harmony import */ var itmar_block_packages__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! itmar-block-packages */ "../../node_modules/itmar-block-packages/build/esm/formatCreate.js");
/* harmony import */ var _createTableSource__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./createTableSource */ "./src/blocks/reservation-block/createTableSource.ts");


 // 上で作った共通関数

const normalizeDateYYYYMMDD = v => v ? String(v).slice(0, 10) : "";
const mapSlotsByDay = (slots, ym) => {
  // Mapの型を <number, DayObjectの一部> として定義
  const map = new Map();
  (slots || []).forEach(row => {
    const ymd = normalizeDateYYYYMMDD(row.slot_date);
    if (!ymd.startsWith(`${ym}-`)) return;
    const day = Number(ymd.slice(8, 10));
    map.set(day, {
      slotId: Number(row.id),
      slotStatus: row.status || "open",
      slotCapacity: Number(row.capacity_total)
    });
  });
  return map;
};
const mergeSlotsIntoCalendar = (calendar, slotMap) => {
  return (calendar || []).map(d => {
    const hit = slotMap.get(Number(d.date));
    return hit ? {
      ...d,
      ...hit
    } : {
      ...d,
      slotId: 0,
      slotStatus: null,
      slotCapacity: null
    };
  });
};
jQuery(function ($) {
  // ✅ 「1つの予約ブロック」ごとに初期化したいので、親ラッパーを推奨
  // 例: save.js の wrapper に class="wp-block-itmaroon-booking-block" を付ける
  $(".wp-block-itmar-reservation-block").each((_index, element) => {
    const $root = $(element);
    //カレンダーブロックは最初の一つだけ取得
    const $calendar = $root.find(".wp-block-itmar-design-calender").first();
    //テーブルブロックはすべて取得
    const $table = $root.find(".wp-block-itmar-design-table");
    //設定された表示用テーブルの識別ID
    const calendarTableId = $root.data("calendar-table-id");
    const bookingTableId = $root.data("booking-table-id");
    //テーブルブロック
    const $calendarTable = $table.filter(`[data-define_id="${calendarTableId}"]`);
    const $bookingTable = $table.filter(`[data-define_id="${bookingTableId}"]`);

    //要素の存在チェック
    if (!$calendar.length || !$table.length) return;
    const MONTH_SELECT = ".itmar_block_selectSingle select";
    let timer = 0;
    let seq = 0;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(refresh, 50);
    };
    //ResourceIdの取得
    const getResourceIdFromRoot = $root => {
      // まず自分（念のため）
      let v = $root.data("resourceId");
      if (v != null) {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) return n;
      }

      // 次に配下（最初に見つかったもの）
      const $hit = $root.find("[data-resource-id]").first();
      if ($hit.length) {
        v = $hit.attr("data-resource-id"); // data()より確実（DOM差し替えにも強い）
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) return n;
      }
      return 0;
    };

    // ✅ select が差し替わってもOK（イベント委譲）
    $calendar.off("change input", MONTH_SELECT) // 既存のリスナーを一度消す
    .on("change input", MONTH_SELECT, schedule);

    // 特定の属性（祝日データ）が書き換わったかチェック
    const obs = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === "attributes" && mutation.attributeName === "data-holiday_array") {
          //祝日データの書き込みを検知, 再描画します
          schedule();
        }
      });
    });

    // $calendarの生の DOM 要素を監視
    const calendarEl = $calendar.get(0);
    if (calendarEl) {
      obs.observe(calendarEl, {
        attributes: true,
        // 属性の変化を監視
        attributeFilter: ["data-holiday_array"],
        // この属性名だけをターゲットにする
        // もし子要素の構造変化も追いたい場合は以下も残す
        childList: false,
        subtree: false
      });
    }
    async function refresh() {
      const selectedMonth = $calendar.find(MONTH_SELECT).val(); // "YYYY/MM"
      if (!selectedMonth) return;
      const {
        from,
        to,
        ym,
        year,
        month
      } = (0,itmar_block_packages__WEBPACK_IMPORTED_MODULE_1__.getMonthRangeYmd)(selectedMonth);
      if (!from || !to) return;

      // resourceId は save.js で data-resource-id を出すのが最も安定
      const resourceId = getResourceIdFromRoot($root);
      if (!resourceId) return;
      const mySeq = ++seq;
      //$calendarに祝日情報があれば配列を作る
      const holidayString = $calendar.attr("data-holiday_array");
      const holidays = holidayString ? JSON.parse(holidayString) : [];

      // ✅ 月の基本配列（祝日込み）
      const baseCalendar = (0,itmar_block_packages__WEBPACK_IMPORTED_MODULE_1__.generateMonthCalendar)(selectedMonth, holidays);

      // ✅ slots取得
      const slotPath = `/itmar/v1/slots?resource_id=${encodeURIComponent(resourceId)}` + `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const slots = await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_0___default()({
        path: slotPath
      });
      if (mySeq !== seq) return;
      const slotMap = mapSlotsByDay(slots, ym);
      const mergedCalendar = mergeSlotsIntoCalendar(baseCalendar, slotMap);

      // ✅ 共通 buildCalendarTableSource を使用（renderCellだけview用に注入）
      const calendarSource = (0,_createTableSource__WEBPACK_IMPORTED_MODULE_3__.buildCalendarTableSource)(selectedMonth, mergedCalendar, {
        isMonday: false,
        renderCell: _createTableSource__WEBPACK_IMPORTED_MODULE_3__.renderBookingCellHtml
      });
      const bookingPath = "/itmar/v1/get_user_bookings";
      const bookings = await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_0___default()({
        path: bookingPath
      });

      // 予約一覧用の Source を作成
      const bookingSource = (0,_createTableSource__WEBPACK_IMPORTED_MODULE_3__.buildBookingListTableSource)(bookings, {
        renderActions: _createTableSource__WEBPACK_IMPORTED_MODULE_3__.renderCancelButtonHtml
      });

      //テーブルの再レンダリング
      const calendarTableElement = $calendarTable[0] || null;
      (0,_createTableSource__WEBPACK_IMPORTED_MODULE_3__.renderTableFromTableSource)(calendarTableElement, calendarSource);
      const bookingTableElement = $bookingTable[0] || null;
      (0,_createTableSource__WEBPACK_IMPORTED_MODULE_3__.renderTableFromTableSource)(bookingTableElement, bookingSource);
    }

    //Design Titleの中味にデータ流し込むヘルパ
    const enterTitle = ($dateElm, formatedValue) => {
      const $targetDiv = $dateElm.find("h1, h2, h3, h4, h5, h6").find("div");
      if ($targetDiv.length) {
        // テキストを流し込む
        $targetDiv.text(formatedValue);
      }
    };

    // 「親の親」にある #reservation_modal を探して表示させる
    const $reservation_modal = $root.find("#reservation_modal").parent().parent();

    // $calendarTable 内のセル（td）がクリックされた時のイベント（予約登録）
    $calendarTable.on("click", "td", function () {
      //選択された月を取得
      const selectedMonth = $calendar.find(MONTH_SELECT).val(); // "YYYY/MM"
      if (!selectedMonth) return;
      const $clickedCell = $(this);
      const selDate = `${selectedMonth}/${$clickedCell.data("date")}`;
      const slotId = $clickedCell.data("slot-id");
      const slotCapa = $clickedCell.data("capacity");

      //モーダル内の日付表示要素を取得
      const $dateElm = $reservation_modal.find('[data-unique_id="reservation_date"]');

      //フォーマットを当てて表示
      const formatedValue = (0,itmar_block_packages__WEBPACK_IMPORTED_MODULE_2__.displayFormated)(selDate, $dateElm.data("user_format"), $dateElm.data("free_format"), $dateElm.data("decimal"));
      enterTitle($dateElm, formatedValue);
      if ($reservation_modal.length) {
        //
        $reservation_modal.data("slot-id", slotId);
        // 人数入力の上限だけは反映させておく
        $reservation_modal.find('input[name="guest_count"]').attr("max", slotCapa);
        // モーダルを表示（CSSで display: none になっている場合）
        $reservation_modal.fadeIn();
      } else {
        console.error("モーダルが見つかりません。IDを確認してください。");
      }
    });

    //キャンセル確認のモーダルを出す
    const $cancel_modal = $root.find("#cancel_modal").parent().parent();

    // $bookingTable 内のキャンセルボタンがクリックされた時のイベント（予約キャンセル）
    $bookingTable.on("click", ".itmar-cancel-button", async function (e) {
      // 1. クリックされたボタンから見て、所属している「行(tr)」を取得
      const $td = $(e.currentTarget).closest("td");
      const bookingId = $td.data("booking-id");
      console.log(bookingId);
      // 1. クリックされたボタンから見て、所属している「行(tr)」を取得
      const $row = $(e.currentTarget).closest("tr");
      // 2. その行にあるすべての td 要素からテキストを抽出して配列にする
      // .map() を使うと1行で綺麗に取得できます
      const rowData = $row.find("td").map(function () {
        return $(this).text().trim(); // 余計な改行や空白を除去
      }).get(); // jQueryオブジェクトを純粋な配列に変換

      //モーダル内の日付表示要素を取得
      const $dateElm = $cancel_modal.find('[data-unique_id="reservation_date"]');
      //フォーマットを当てて表示
      const formatedValue = (0,itmar_block_packages__WEBPACK_IMPORTED_MODULE_2__.displayFormated)(rowData[0], $dateElm.data("user_format"), $dateElm.data("free_format"), $dateElm.data("decimal"));
      enterTitle($dateElm, formatedValue);
      const $slotNameElm = $cancel_modal.find('[data-unique_id="slot_name"]');
      enterTitle($slotNameElm, rowData[1]);
      const $gestCountElm = $cancel_modal.find('[data-unique_id="guest_count"]');
      enterTitle($gestCountElm, rowData[2]);
      $cancel_modal.data("booking-id", bookingId);
      $cancel_modal.fadeIn();
    });

    //確認モーダルのサブミット
    $reservation_modal.on("submit", "form", async function (e) {
      e.preventDefault(); // ページ遷移を止める

      const $form = $(this);
      const $submitBtn = $form.find('button[type="submit"]');
      const $modalElement = $form.closest($reservation_modal);

      // ✅ モーダルに保存しておいた ID を取得
      const slotId = $modalElement.data("slot-id");

      // フォーム内の「人数」を取得
      const guestCount = $form.find('input[name="guest_count"]').val();

      // 送信データを作成
      const data = {
        slot_id: slotId,
        guest_count: guestCount
      };
      // ボタンを無効化して連打防止
      $submitBtn.prop("disabled", true).text("送信中...");
      try {
        await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_0___default()({
          path: "/itmar/v1/bookings",
          method: "POST",
          data: data
        });
        alert("予約が完了しました！");

        // ✅ 予約が成功したので、カレンダーの残数を最新にするために再描画
        if (typeof refresh === "function") {
          refresh();
        }
      } catch (error) {
        // error が Error オブジェクトかどうかをチェック
        if (error instanceof Error) {
          console.error("予約エラー:", error.message);
          alert("予約に失敗しました: " + error.message);
        } else {
          // 文字列などが投げられた場合のフォールバック
          console.error("予期せぬエラー:", error);
          alert("不明なエラーが発生しました");
        }
      } finally {
        $submitBtn.prop("disabled", false).text("予約を確定する");
        $reservation_modal.fadeOut();
      }
    });

    //キャンセルのサブミット処理
    $cancel_modal.on("submit", "form", async function (e) {
      e.preventDefault(); // ページ遷移を止める

      const $form = $(this);
      const $submitBtn = $form.find('button[type="submit"]');
      const $modalElement = $form.closest($cancel_modal);

      // ✅ モーダルに保存しておいた ID を取得
      const bookingId = $modalElement.data("booking-id");

      // ボタンを無効化して連打防止
      $submitBtn.prop("disabled", true).text("送信中...");

      // 送信データを作成
      const data = {
        id: bookingId
      };
      try {
        await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_0___default()({
          path: "/itmar/v1/cancel_booking",
          method: "POST",
          data: data
        });
        alert("キャンセルしました！");
        if (typeof refresh === "function") {
          refresh();
        }
      } catch (error) {
        // error が Error オブジェクトかどうかをチェック
        if (error instanceof Error) {
          console.error("予約エラー:", error.message);
          alert("予約に失敗しました: " + error.message);
        } else {
          // 文字列などが投げられた場合のフォールバック
          console.error("予期せぬエラー:", error);
          alert("不明なエラーが発生しました");
        }
      } finally {
        $submitBtn.prop("disabled", false).text("キャンセル");
        $cancel_modal.fadeOut();
      }
    });
  });
});
})();

/******/ })()
;
//# sourceMappingURL=view.js.map