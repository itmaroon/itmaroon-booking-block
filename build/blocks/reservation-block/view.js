<<<<<<< HEAD
(()=>{"use strict";var t={n:e=>{var a=e&&e.__esModule?()=>e.default:()=>e;return t.d(a,{a}),a},d:(e,a)=>{for(var n in a)t.o(a,n)&&!t.o(e,n)&&Object.defineProperty(e,n,{enumerable:!0,get:a[n]})},o:(t,e)=>Object.prototype.hasOwnProperty.call(t,e)};const e=window.wp.i18n,a=window.wp.apiFetch;var n=t.n(a);window.ReactJSXRuntime,window.wp.components;const r=t=>String(t).padStart(2,"0"),o=t=>{const e={ym:"",from:"",to:"",year:0,month:0,lastDay:0};if(!t)return e;const[a,n]=String(t).split("/"),o=Number(a),i=Number(n);if(isNaN(o)||isNaN(i)||0===o||0===i)return e;const s=new Date(o,i,0).getDate(),l=r(i);return{ym:`${o}-${l}`,from:`${o}-${l}-01`,to:`${o}-${l}-${r(s)}`,year:o,month:i,lastDay:s}},i=["sun","mon","tue","wed","thu","fri","sat"],s=window.wp.date,l=[{label:"YYYY-MM-DD HH:mm:ss",value:"Y-m-d H:i:s"},{label:"MM/DD/YYYY",value:"m/d/Y"},{label:"DD/MM/YYYY",value:"d/m/Y"},{label:"MMMM D, YYYY",value:"F j, Y"},{label:"HH:mm:ss",value:"H:i:s"},{label:"YYYY.M.D",value:"Y.n.j"},{label:"Day, MMMM D, YYYY",value:"l, F j, Y"},{label:"ddd, MMM D, YYYY",value:"D, M j, Y"},{label:"YYYY年M月D日 (曜日)",value:"Y年n月j日 (l)"}],c=[{key:"str_free",label:(0,e.__)("Free String","block-collections"),value:"%s"},{key:"num_comma",label:(0,e.__)("Numbers (comma separated)","block-collections"),value:{style:"decimal",useGrouping:!0}},{key:"num_no_comma",label:(0,e.__)("Numbers (no commas)","block-collections"),value:{style:"decimal",useGrouping:!1}},{key:"num_amount",label:(0,e.__)("Amount","block-collections"),value:{style:"currency",currency:"JPY"}}],d=(t,e,a,n)=>{if(null==t)return"";const r=(0,s.getSettings)().l10n?.locale||"en";if(l.find(t=>t.value===e)&&e)return(0,s.format)(e,t);const o=c.find(t=>t.key===e)?.value;if("object"==typeof o&&null!==o)try{const e="number"==typeof t?t:parseFloat(t);if(isNaN(e))return String(t);const a={...o};return"number"==typeof n&&n>0&&(a.minimumFractionDigits=n,a.maximumFractionDigits=n),new Intl.NumberFormat(r,a).format(e)}catch(e){return console.warn("Number format failed:",e),String(t)}else if("string"==typeof o)return a.replace("%s",String(t));return t},u=(t,e)=>{if(!t||!Array.isArray(e))return;const a=t.querySelector("table");if(!a)return;a.style.width="100%",a.style.tableLayout="fixed",a.querySelectorAll("tbody").forEach(t=>t.remove());const n=document.createElement("tbody");a.appendChild(n);const r=document.createDocumentFragment();for(const t of e){if(!t||!Array.isArray(t.cells))continue;const e=document.createElement("tr");for(const a of t.cells){const t="th"===a?.tag?"th":"td",n=document.createElement(t),r=document.createElement("span"),o=a?.content;a.attributes&&Object.entries(a.attributes).forEach(([t,e])=>{null!=e&&n.setAttribute(t,String(e))}),a.style&&Object.entries(a.style).forEach(([t,e])=>{null!=e&&(n.style[t]=String(e))}),null==o||(o instanceof Node?r.appendChild(o):"string"==typeof o?r.innerHTML=o:r.textContent=String(o)),n.appendChild(r),e.appendChild(n)}r.appendChild(e)}n.appendChild(r)},m=(t,e,a)=>{const n=t?.slotStatus||"",r=null!==t.slotCapacity&&void 0!==t.slotCapacity?`remain: ${t.slotCapacity} `:"",o=0===t.slotCapacity?"✕":Number(t.slotCapacity)/Number(t.capacityNum)<a.enoughBorder/100?"△":null!==t.slotCapacity&&void 0!==t.slotCapacity?"〇":"",i=t?.holiday&&"holiday"!==t.holiday?(s=t.holiday,String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")):"";var s;return`\n\t\t<div style="line-height:1.3; min-height: 50px;">\n            <div style="font-weight:600;">${e}</div>\n\t\t\t${a.isDispHoliday?`<div style="font-size:11px; opacity:0.8;">${i}</div>`:""}\n            ${"closed"===n?`<div style="color:red; font-size:10px;">${a.restDisp}</div>`:""}\n            ${"number"===a.remainDisp&&"closed"!=n?`<div style="font-size:11px; opacity:0.8;">${r}</div>`:""}\n\t\t\t${"sign"===a.remainDisp&&"closed"!=n?`<div style="font-size:14px;text-align: center;padding-top:3px">${o}</div>`:""}\n        </div>\n\t`.trim()},p=(t,e=!1)=>{if("cancelled"===t.booking_status){let a='<span style="color: #999;">キャンセル済み</span>';return e&&(a+=` \n\t\t\t\t<input \n\t\t\t\t\ttype="checkbox" \n\t\t\t\t\tclass="itmar-delete-checkbox" \n\t\t\t\t\tvalue="${t.booking_id}" \n\t\t\t\t\tstyle="margin-left: 8px; vertical-align: middle; cursor: pointer;"\n\t\t\t\t\tonclick="event.stopPropagation();" \n\t\t\t\t>\n\t\t\t`),a.trim()}return'\n        <button \n            type="button" \n            class="itmar-cancel-button" \n            style="background:#e53935; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;"\n        >\n            変更・キャンセル\n        </button>\n    '.trim()};jQuery(function(t){t(".wp-block-itmar-reservation-block").each((a,r)=>{const s=t(r),l=s.find(".wp-block-itmar-design-calender").first(),c=s.find(".wp-block-itmar-design-table"),g=s.attr("data-attributes");if(!g)return;const f=JSON.parse(g),{resourceRest:b,resourceId:y,calendarTableId:_,timeTableId:h,bookingTableId:v,infoMessages:k,dispUniqueIds:S,confirmModal:w,reserveForm:D,cancelModForm:N,buttonIDs:$,...C}=f,Y=c.filter(`[data-define_id="${_}"]`),x=c.filter(`[data-define_id="${h}"]`),O=c.filter(`[data-define_id="${v}"]`);if(!l.length||!c.length)return;const M=".itmar_block_selectSingle select";let A=0,j=0;const T=()=>{window.clearTimeout(A),A=window.setTimeout(q,50)};l.off("change input",M).on("change input",M,T);const B=new MutationObserver(t=>{t.forEach(t=>{"attributes"===t.type&&"data-holiday_array"===t.attributeName&&T()})}),I=l.get(0);I&&B.observe(I,{attributes:!0,attributeFilter:["data-holiday_array"],childList:!1,subtree:!1});const J=(t,e)=>{const a=t.find("h1, h2, h3, h4, h5, h6");a.length&&a.text(e)};let E={},F="";async function q(){const t=l.find(M).val();if(!t)return;x.hide(),F=await H(y)||"";const{from:e,to:a,ym:r}=o(t);if(!e||!a)return;if(!y)return;if(S.resourceName){const{type:t,id:e}=JSON.parse(S.resourceName);if("itmar/design-title"===t){const t=s.find(`[data-unique_id=${e}]`);J(t,F)}}const c=++j,d=l.attr("data-holiday_array"),g=((t,e=null)=>{const[a,n]=t.split("/").map(Number),r=new Date(a,n-1,1),o=new Date(a,n,0).getDate(),i=[];for(let t=1;t<=o;t++){r.setDate(t);const o=e?.find(e=>{const r=String(e.date??""),o=r.slice(0,4),i=r.replace(/\D/g,"").slice(4,6),s=r.replace(/\D/g,"").slice(6,8),l=Number(o),c=Number(i),d=Number(s);return l===a&&c===n&&d===t}),s=o?{date:t,weekday:r.getDay(),holiday:o.name}:{date:t,weekday:r.getDay()};i.push(s)}return i})(t,d?JSON.parse(d):[]),f=`/itmar/v1/slots?resource_id=${encodeURIComponent(y)}&from=${encodeURIComponent(e)}&to=${encodeURIComponent(a)}`,b=await n()({path:f});if(c!==j)return;const _=((t,e,a)=>{const n={};return(t??[]).forEach(t=>{const a=(r=t.slot_date)?String(r).slice(0,10):"";var r;if(!a.startsWith(`${e}-`))return;const o=Number(a.slice(8,10)),i=`${t.start_time}～${t.end_time}`;n[o]||(n[o]={}),n[o][i]||(n[o][i]={avail:0,total:0}),"open"===t.status&&(n[o][i].total+=Number(t.capacity.max),t.is_booked||(n[o][i].avail+=Number(t.capacity.max)))}),{dataVal:a.map(t=>{const e=Number(t.date),a=n[e];if(!a||0===Object.keys(a).length)return{...t,slotStatus:"closed",slotCapacity:0,capacityNum:0};const r=Object.keys(a);if(1===r.length){const e=a[r[0]];return{...t,slotStatus:"open",slotCapacity:e.avail,capacityNum:e.total}}return{...t,slotStatus:"mixed",slotCapacity:null,capacityNum:null}}),dailyStats:n}})(b,r,g),h=((t,e,{isMonday:a=!1,headerFormatter:n=t=>t.charAt(0).toUpperCase()+t.slice(1),renderCell:r,renderStyle:s})=>{if(!t||!Array.isArray(e)||0===e.length)return[];const{year:l,month:c,lastDay:d}=o(t);if(!l||!c||!d)return[];const u=((t,e,a)=>{const n=[];let r=1;const o=a?t-1<0?6:t-1:t,s=[];let l;for(let t=0;t<7;t++)l=a?t+1:t,l>6&&(l=0),s.push(i[l]);n.push(s.join(" "));for(let t=0;t<6;t++){const a=[];for(let n=0;n<7;n++)0===t&&n<o||r>e?a.push(`empty${t}`):(a.push(`day${r}`),r++);5==t&&(a[5]="day_clear",a[6]="day_clear"),n.push(a.join(" "))}return n.map(t=>`"${t}"`).join("\n")})(new Date(l,c-1,1).getDay(),d,a).split("\n").map(t=>t.replace(/"/g,"").trim()).filter(Boolean),m=(u[0]||"").split(/\s+/);let p=u.slice(1),g=-1;for(let t=0;t<p.length;t++)/\bday\d+\b/.test(p[t])&&(g=t);p=g>=0?p.slice(0,g+1):[];const f=new Map(e.map(t=>[Number(t.date),t])),b=[];b.push({cells:m.map(t=>({tag:"th",content:n(t)}))});for(const t of p){const e=t.split(/\s+/);b.push({cells:e.map(t=>{const e=t.match(/^day(\d+)$/);if(!e)return{tag:"td",content:""};const a=Number(e[1]),n=f.get(a)||{date:a,weekday:""},o="closed"===n.slotStatus?s.close_bg:0===n.slotCapacity?s.empty_bg:Number(n.slotCapacity)/Number(n.capacityNum)<s.enoughBorder/100?s.low_bg:s.enough_bg,i="closed"===n.slotStatus?"default":"pointer";return{tag:"td",content:r(n,a,s),style:{background:o,cursor:i},attributes:{"data-date":n.date,"data-slotStatus":n.slotStatus||""}}})})}return b})(t,_.dataVal,{isMonday:!1,renderCell:m,renderStyle:{isDispHoliday:C.isHoliday,enoughBorder:C.enoughBorder,enough_bg:C.enoughBgColor||C.enoughGradient,low_bg:C.lowBgColor||C.lowGradient,empty_bg:C.emptyBgColor||C.emptyGradient,close_bg:C.closeBgColor||C.closeGradient,remainDisp:C.remainDisp,restDisp:C.restDisp}});E=_.dailyStats;const v=Y[0]||null;if(u(v,h),itmar_option.isLoggedIn)try{const t=`/itmar/v1/get_user_bookings?resource_id=${y}`,e=((t,{renderActions:e},a=!1)=>{if(!Array.isArray(t)||0===t.length)return[{cells:[{tag:"td",content:"予約データが見つかりません。",attributes:{colspan:4}}]}];const n=[];return t.forEach(t=>{const r=[{tag:"td",content:t.reserve_date}];"00:00:00"===t.reserve_time&&"23:59:59"===t.end_time||r.push({tag:"td",content:`${t.reserve_time.substring(0,5)}～${t.end_time.substring(0,5)}`,attributes:{class:"reservation_time_cell"}}),r.push({tag:"td",content:`${t.guest_count} 名`},{tag:"td",content:e(t,a),attributes:{"data-booking-id":t.booking_id,"data-slot-ids":t.slot_ids,"data-status":t.booking_status,"data-reserve-date":t.reserve_date,"data-guest-count":t.guest_count}}),n.push({cells:r})}),n})(await n()({path:t}),{renderActions:p}),a=O[0]||null;u(a,e)}catch(t){console.error(t.message)}}const H=async t=>{try{return(await n()({path:`/wp/v2/${b}/${t}`})).title.rendered}catch(t){console.error("リソース名の取得に失敗しました:",t)}},G=s.find(`#${w}`).parent().parent();Y.on("click","td",function(){const e=l.find(M).val();if(!e)return;const a=t(this),n=Number(a.data("date"));if(E[n]){if(Y.find("td").removeClass("currentSel"),a.addClass("currentSel"),Object.keys(E[n]).length>1){const t={isDispHoliday:C.isHoliday,enoughBorder:C.enoughBorder,enough_bg:C.enoughBgColor||C.enoughGradient,low_bg:C.lowBgColor||C.lowGradient,empty_bg:C.emptyBgColor||C.emptyGradient,close_bg:C.closeBgColor||C.closeGradient,remainDisp:C.remainDisp},e=((t,e)=>{const a=[];return Object.keys(t).sort().forEach(n=>{const r=t[n],o=0===r.avail?e.empty_bg:Number(r.avail)/Number(r.total)<e.enoughBorder/100?e.low_bg:e.enough_bg,i=0===r.avail?"✕":Number(r.avail)/Number(r.total)<e.enoughBorder/100?"△":"〇",s="number"===e.remainDisp?`remain: ${r.avail}`:i,l=r.avail?"pointer":"default";a.push({cells:[{tag:"td",content:n},{tag:"td",content:s,style:{background:o,textAlign:"center",cursor:l},attributes:{"data-time":n,"data-avail":r.avail}}]})}),a})(E[n],t),a=x[0]||null;return u(a,e),void x.show()}{const t=e.replace(/\//g,"-"),a=Y.find("td.currentSel").data("date"),n=String(a).padStart(2,"0");P(`${t}-${n}`)}}}),x.on("click","td",function(){const e=l.find(M).val();if(!e)return;if(!Y.find("td.currentSel").length)return;const a=Y.find("td.currentSel").data("date"),n=t(this);if(n.data("avail")<1)return;const r=e.replace(/\//g,"-"),o=String(a).padStart(2,"0");P(`${r}-${o}`,n.data("time"))});const P=async(t,e="")=>{if(S.reserveDate){const e=JSON.parse(S.reserveDate).id,a=G.find(`[data-unique_id=${e}]`),n=d(t,a.data("user_format"),a.data("free_format"),a.data("decimal"));a&&(J(a,n),a.attr("data-value",t))}if(S.reserveTime){const t=JSON.parse(S.reserveTime).id,a=G.find(`[data-unique_id=${t}]`);a&&(J(a,e),a.attr("data-value",e))}if(S.resourceName){const t=JSON.parse(S.resourceName).id,e=G.find(`[data-unique_id=${t}]`);e&&J(e,F)}if(S.guestCount){const t=JSON.parse(S.guestCount).id;G.find(`#${t}`).val(1)}if(itmar_option.isLoggedIn)if(G.length){const t=G.find(".wp-block-itmar-contactmail-sender");t&&t.trigger("fieldset:action",{type:N}),G.fadeIn()}else console.error("モーダルが見つかりません。IDを確認してください。");else alert("予約にはログインが必要です。")};O.on("click",".itmar-cancel-button",async function(e){if(G.length<1)return void console.error("モーダルが見つかりません。IDを確認してください。");const a=G.find(".wp-block-itmar-contactmail-sender");a&&a.trigger("fieldset:action",{type:D});const n=t(e.currentTarget).closest("td"),r=n.data("booking-id"),o=n.data("slot-ids"),i=n.data("reserve-date"),s=n.data("guest-count"),l=t(e.currentTarget).closest("tr");if(S.reserveDate){const t=JSON.parse(S.reserveDate).id,e=G.find(`[data-unique_id=${t}]`),a=d(i,e.data("user_format"),e.data("free_format"),e.data("decimal"));J(e,a)}if(S.reserveTime){const t=JSON.parse(S.reserveTime).id,e=G.find(`[data-unique_id=${t}]`),a=l.find("td.reservation_time_cell").text().trim();J(e,a)}if(S.guestCount){const t=JSON.parse(S.guestCount).id,e=G.find(`#${t}`),a=parseInt(s,10);e.val(a),e.data("prev_value",a)}G.data("booking-id",r),G.data("slot-ids",o),G.fadeIn()});let R="";G.on("submit","form",async function(a){if(a.preventDefault(),!a.originalEvent)return;const r=t(this),o=r.find('button[type="submit"]'),i=o.map(function(){return t(this).text()}).get();if("to_confirm_form"===r.attr("id"))R=a.originalEvent?.submitter?.dataset.key;else if("itmar_send_exec"===r.attr("id")){const s=a.originalEvent.submitter?.dataset.back;if("back"===s)return;const l=r.closest(G).data("booking-id");o.prop("disabled",!0).text((0,e.__)("Sending...","itmaroon-booking-block")),t(this).closest(".wp-block-itmar-contactmail-sender").find("#to_confirm_form");let c=0,d="",u="";if(S.guestCount){const e=JSON.parse(S.guestCount).id;c=t(`input[name=${e}]`).val()}const m=t('input[name="same_table"]').prop("checked")||!1;if(S.reserveDate){const e=JSON.parse(S.reserveDate).id;d=t(`[data-unique_id=${e}]`)?.attr("data-value")}if(S.reserveTime){const e=JSON.parse(S.reserveTime).id;u=t(`[data-unique_id=${e}]`)?.attr("data-value")||"00:00"}let p={code:"error",text:k.error};try{if(o.prop("disabled",!0).text((0,e.__)("Sending...","itmaroon-booking-block")),R===$.reserve){const t={resource_id:y,guest_count:c,is_same_unit:m,reserveDate:d,reserveTime:u},a=await n()({path:"/itmar/v1/bookings",method:"POST",data:t});p={code:a.info_code,text:k[a.info_code]},p.text?alert(p.text):alert((0,e.__)("Operation Complete","itmaroon-booking-block"))}else if(R===$.modify){const t={id:l,is_same_unit:m,guest_count:c},a=await n()({path:"/itmar/v1/change_booking",method:"POST",data:t});p={code:a.info_code,text:k[a.info_code]},p.text?alert(p.text):alert((0,e.__)("Operation Complete","itmaroon-booking-block"))}else if(R===$.cancel){const t={id:l,is_same_unit:m,guest_count:c},a=await n()({path:"/itmar/v1/cancel_booking",method:"POST",data:t});p={code:a.info_code,text:k[a.info_code]},p.text?alert(p.text):alert((0,e.__)("Operation Complete","itmaroon-booking-block"))}}catch(t){console.error("予約エラー:",t.message),p={code:t.info_code,text:k[t.info_code]?k[t.info_code]:t.message},p?alert(p.text):alert("不明なエラーが発生しました")}finally{o.each(function(e){t(this).prop("disabled",!1).text(i[e])}),q(),"noChange"===p.code?G.fadeOut():(console.log(p),t("#itmar_send_exec").trigger("submit",{message:p}))}}})})})})();
=======
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
/* harmony export */   buildTimeTableSource: () => (/* binding */ buildTimeTableSource),
/* harmony export */   renderBookingCellHtml: () => (/* binding */ renderBookingCellHtml),
/* harmony export */   renderCancelButtonHtml: () => (/* binding */ renderCancelButtonHtml),
/* harmony export */   renderTableFromTableSource: () => (/* binding */ renderTableFromTableSource),
/* harmony export */   slotInfoCalendar: () => (/* binding */ slotInfoCalendar)
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
      //追加のスタイルを追加
      if (cell.style) {
        Object.entries(cell.style).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            // el.style["backgroundColor"] = "red" のような形で直接セット
            // CSSのプロパティ名（kebab-case）でも、JSのプロパティ名（camelCase）でも動作します
            el.style[key] = String(value);
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

const slotInfoCalendar = (slots, ym, dateValues) => {
  // 日付ごとに「時間帯別の集計」を一時保持する場所
  // { [day]: { [time]: { avail: number, total: number } } }
  const tempDailyStats = {};
  (slots ?? []).forEach(row => {
    const ymd = (0,itmar_block_packages__WEBPACK_IMPORTED_MODULE_0__.normalizeDateYYYYMMDD)(row.slot_date);
    if (!ymd.startsWith(`${ym}-`)) return;
    const day = Number(ymd.slice(8, 10));
    const time = `${row.start_time}～${row.end_time}`; // "09:00～10:00" など

    if (!tempDailyStats[day]) tempDailyStats[day] = {};
    if (!tempDailyStats[day][time]) tempDailyStats[day][time] = {
      avail: 0,
      total: 0
    };

    // その時間帯の合計を算出
    if (row.status === "open") {
      tempDailyStats[day][time].total += Number(row.capacity.max);
      if (!row.is_booked) {
        tempDailyStats[day][time].avail += Number(row.capacity.max);
      }
    }
  });

  // 2段階目：カレンダー表示用の判定ロジック
  // dateValues（カレンダーの枠組み）に対してマッピング
  const newDateValues = dateValues.map(dv => {
    const day = Number(dv.date);
    const timeSlots = tempDailyStats[day]; // その日の時間枠リスト

    // A. データそのものがない場合 -> Closed（休業）
    if (!timeSlots || Object.keys(timeSlots).length === 0) {
      return {
        ...dv,
        slotStatus: "closed",
        slotCapacity: 0,
        capacityNum: 0
      };
    }
    const timeKeys = Object.keys(timeSlots);

    // B. 単一の時間枠のみ存在する場合 -> 数字を表示
    if (timeKeys.length === 1) {
      const stats = timeSlots[timeKeys[0]];
      return {
        ...dv,
        slotStatus: "open",
        // 状態を表示
        slotCapacity: stats.avail,
        capacityNum: stats.total
      };
    }
    // C. 複数の時間枠がある場合 -> カレンダー上は数字を表示しない（空文字や特定の記号）
    return {
      ...dv,
      slotStatus: "mixed",
      // 内部的な判定用
      slotCapacity: null,
      // renderBookingCellHtml で null なら非表示にする
      capacityNum: null
    };
  });
  return {
    dataVal: newDateValues,
    dailyStats: tempDailyStats
  };
};
const buildCalendarTableSource = (selectedMonth, calendar, {
  isMonday = false,
  headerFormatter = w => w.charAt(0).toUpperCase() + w.slice(1),
  renderCell,
  renderStyle
}) => {
  if (!selectedMonth || !Array.isArray(calendar) || calendar.length === 0) return [];
  //selectedMonthから年、月、最終日を取り出す
  const {
    year,
    month,
    lastDay
  } = (0,itmar_block_packages__WEBPACK_IMPORTED_MODULE_0__.getMonthRangeYmd)(selectedMonth);
  if (!year || !month || !lastDay) return [];
  //その年月の初日の曜日を割り出す
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0..6
  //カレンダーのグリッドを作る
  const areasStr = (0,itmar_block_packages__WEBPACK_IMPORTED_MODULE_0__.generateGridAreas)(firstDayOfMonth, lastDay, isMonday);
  const lines = areasStr.split("\n").map(l => l.replace(/"/g, "").trim()).filter(Boolean);

  //最初の行は予備の行にする
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

  // header row(曜日の表示)
  tableSource.push({
    cells: headerTokens.map(w => ({
      tag: "th",
      content: headerFormatter(w) //最初の文字を大文字にするフォーマット
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
        //その日の空き具合による背景色の設定
        const cellBackground = dayObj.slotStatus === "closed" ? renderStyle.close_bg : dayObj.slotCapacity === 0 ? renderStyle.empty_bg : Number(dayObj.slotCapacity) / Number(dayObj.capacityNum) < renderStyle.enoughBorder / 100 ? renderStyle.low_bg : renderStyle.enough_bg;
        //カーソルの設定
        const cursorDisp = dayObj.slotStatus === "closed" ? "default" : "pointer";
        return {
          tag: "td",
          // string ではなく "td" 型として明示
          content: renderCell(dayObj, dayNum, renderStyle),
          style: {
            background: cellBackground,
            cursor: cursorDisp
          },
          // ✅ ここに data 属性用のオブジェクトを追加
          attributes: {
            "data-date": dayObj.date,
            "data-slotStatus": dayObj.slotStatus || ""
          }
        };
      })
    });
  }
  return tableSource;
};
const buildTimeTableSource = (dailyStats, renderStyle) => {
  const tableSource = [];

  // 時間（Key）を昇順に並べてループを回す
  const sortedTimes = Object.keys(dailyStats).sort();
  sortedTimes.forEach(time => {
    const stats = dailyStats[time];

    //その日の空き具合による背景色の設定
    const cellBackground = stats.avail === 0 ? renderStyle.empty_bg : Number(stats.avail) / Number(stats.total) < renderStyle.enoughBorder / 100 ? renderStyle.low_bg : renderStyle.enough_bg;
    //空き状況記号
    const remaindMark = stats.avail === 0 ? "✕" : Number(stats.avail) / Number(stats.total) < renderStyle.enoughBorder / 100 ? "△" : "〇";
    const renderContent = renderStyle.remainDisp === "number" ? `remain: ${stats.avail}` : remaindMark;
    const cursorDisp = !stats.avail ? "default" : "pointer";
    tableSource.push({
      cells: [{
        tag: "td",
        content: time
      }, {
        tag: "td",
        content: renderContent,
        style: {
          background: cellBackground,
          textAlign: "center",
          cursor: cursorDisp
        },
        attributes: {
          "data-time": time,
          "data-avail": stats.avail
        }
      }]
    });
  });
  return tableSource;
};
const buildBookingListTableSource = (bookings, {
  renderActions // キャンセルボタンなどを描画するコールバック
}, showCheckbox = false) => {
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
    // 1. まず日付セルを入れた配列を作成
    const cells = [{
      tag: "td",
      content: booking.reserve_date
    }];
    // 2. 時間を表示すべきリソースか判定して push する
    // ここで is_time_resource（仮）などのフラグで判定
    if (!(booking.reserve_time === "00:00:00" && booking.end_time === "23:59:59")) {
      cells.push({
        tag: "td",
        content: `${booking.reserve_time.substring(0, 5)}～${booking.end_time.substring(0, 5)}`,
        attributes: {
          class: "reservation_time_cell" // ここにクラス名を追加
        }
      });
    }

    // 3. 残りのセルを push
    cells.push({
      tag: "td",
      content: `${booking.guest_count} 名`
    }, {
      tag: "td",
      content: renderActions(booking, showCheckbox),
      attributes: {
        "data-booking-id": booking.booking_id,
        "data-slot-ids": booking.slot_ids,
        "data-status": booking.booking_status,
        "data-reserve-date": booking.reserve_date,
        "data-guest-count": booking.guest_count
      }
    });
    tableSource.push({
      cells
    });
  });
  return tableSource;
};
const escapeHtml = s => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const renderBookingCellHtml = (dayObj, dayNum, renderStyle) => {
  const status = dayObj?.slotStatus || "";
  // null の場合は空文字、数字がある場合はそのまま表示
  const capDisplay = dayObj.slotCapacity !== null && dayObj.slotCapacity !== undefined ? `remain: ${dayObj.slotCapacity} ` : "";
  //空き状況記号
  const remaindMark = dayObj.slotCapacity === 0 ? "✕" : Number(dayObj.slotCapacity) / Number(dayObj.capacityNum) < renderStyle.enoughBorder / 100 ? "△" : dayObj.slotCapacity !== null && dayObj.slotCapacity !== undefined ? "〇" : "";

  // 「holiday」文字
  const holiday = dayObj?.holiday && dayObj.holiday !== "holiday" ? escapeHtml(dayObj.holiday) : "";
  return `
		<div style="line-height:1.3; min-height: 50px;">
            <div style="font-weight:600;">${dayNum}</div>
			${renderStyle.isDispHoliday ? `<div style="font-size:11px; opacity:0.8;">${holiday}</div>` : ""}
            ${status === "closed" ? `<div style="color:red; font-size:10px;">${renderStyle.restDisp}</div>` : ""}
            ${renderStyle.remainDisp === "number" && status != "closed" ? `<div style="font-size:11px; opacity:0.8;">${capDisplay}</div>` : ""}
			${renderStyle.remainDisp === "sign" && status != "closed" ? `<div style="font-size:14px;text-align: center;padding-top:3px">${remaindMark}</div>` : ""}
        </div>
	`.trim();
};
const renderCancelButtonHtml = (booking, showCheckbox = false) => {
  // 既にキャンセル済みの場合はボタンを出さない、または無効化する
  if (booking.booking_status === "cancelled") {
    let html = `<span style="color: #999;">キャンセル済み</span>`;

    // 管理者モード等で、右側にチェックボックスを配置
    if (showCheckbox) {
      html += ` 
				<input 
					type="checkbox" 
					class="itmar-delete-checkbox" 
					value="${booking.booking_id}" 
					style="margin-left: 8px; vertical-align: middle; cursor: pointer;"
					onclick="event.stopPropagation();" 
				>
			`;
    }
    return html.trim();
  }
  return `
        <button 
            type="button" 
            class="itmar-cancel-button" 
            style="background:#e53935; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;"
        >
            変更・キャンセル
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
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/api-fetch */ "@wordpress/api-fetch");
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var itmar_block_packages__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! itmar-block-packages */ "../../node_modules/itmar-block-packages/build/esm/DateElm.js");
/* harmony import */ var itmar_block_packages__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! itmar-block-packages */ "../../node_modules/itmar-block-packages/build/esm/formatCreate.js");
/* harmony import */ var _createTableSource__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./createTableSource */ "./src/blocks/reservation-block/createTableSource.ts");



 // 上で作った共通関数

jQuery(function ($) {
  // ✅ 「1つの予約ブロック」ごとに初期化したいので、親ラッパーを推奨
  // 例: save.js の wrapper に class="wp-block-itmaroon-booking-block" を付ける
  $(".wp-block-itmar-reservation-block").each((_index, element) => {
    const $root = $(element);
    //カレンダーブロックは最初の一つだけ取得
    const $calendar = $root.find(".wp-block-itmar-design-calender").first();
    //テーブルブロックはすべて取得
    const $table = $root.find(".wp-block-itmar-design-table");

    //オブジェクトに変換
    const rawAttributes = $root.attr("data-attributes");
    if (!rawAttributes) {
      return;
    }
    const attributes = JSON.parse(rawAttributes);

    // 必要な変数に割り当て
    // 分割代入（Destructuring）を使うと非常にスッキリします
    const {
      resourceRest,
      resourceId,
      calendarTableId,
      timeTableId,
      bookingTableId,
      infoMessages,
      dispUniqueIds,
      confirmModal,
      reserveForm,
      cancelModForm,
      buttonIDs,
      ...renderStyle
    } = attributes;

    //テーブルブロック
    const $calendarTable = $table.filter(`[data-define_id="${calendarTableId}"]`);
    const $timeTable = $table.filter(`[data-define_id="${timeTableId}"]`);
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

    //Design Titleの中味にデータ流し込むヘルパ
    const enterTitle = ($dateElm, formatedValue) => {
      const $targetDiv = $dateElm.find("h1, h2, h3, h4, h5, h6").find("div");
      if ($targetDiv.length) {
        // テキストを流し込む
        $targetDiv.text(formatedValue);
      }
    };

    //日毎データを定義
    let monthDailyObj = {};

    //リソース名
    let resourceName = "";
    async function refresh() {
      const selectedMonth = $calendar.find(MONTH_SELECT).val(); // "YYYY/MM"
      if (!selectedMonth) return;
      //timeTableはいったん非表示
      $timeTable.hide();

      //リソース名を取得
      resourceName = (await fetchResourceTitle(resourceId)) || "";
      const {
        from,
        to,
        ym
      } = (0,itmar_block_packages__WEBPACK_IMPORTED_MODULE_2__.getMonthRangeYmd)(selectedMonth);
      if (!from || !to) return;

      // resourceId は save.js で data-attributesを出すのが最も安定
      if (!resourceId) return;

      //リソース名の表示
      if (dispUniqueIds.resourceName) {
        const {
          type,
          id
        } = JSON.parse(dispUniqueIds.resourceName);
        if (type === "itmar/design-title") {
          const $resourceElm = $root.find(`[data-unique_id=${id}]`);
          enterTitle($resourceElm, resourceName);
        }
      }
      const mySeq = ++seq;
      //$calendarに祝日情報があれば配列を作る
      const holidayString = $calendar.attr("data-holiday_array");
      const holidays = holidayString ? JSON.parse(holidayString) : [];

      // ✅ 月の基本配列（祝日込み）
      const baseCalendar = (0,itmar_block_packages__WEBPACK_IMPORTED_MODULE_2__.generateMonthCalendar)(selectedMonth, holidays);

      // ✅ slots取得
      const slotPath = `/itmar/v1/slots?resource_id=${encodeURIComponent(resourceId)}` + `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const slots = await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
        path: slotPath
      });
      if (mySeq !== seq) return;

      //カレンダーテーブルレンダリング用のデータを生成
      const calendarInfoObj = (0,_createTableSource__WEBPACK_IMPORTED_MODULE_4__.slotInfoCalendar)(slots, ym, baseCalendar);

      // ✅ 共通 buildCalendarTableSource を使用（renderCellだけview用に注入）
      const calendarSource = (0,_createTableSource__WEBPACK_IMPORTED_MODULE_4__.buildCalendarTableSource)(selectedMonth, calendarInfoObj.dataVal, {
        isMonday: false,
        renderCell: _createTableSource__WEBPACK_IMPORTED_MODULE_4__.renderBookingCellHtml,
        renderStyle: {
          isDispHoliday: renderStyle.isHoliday,
          enoughBorder: renderStyle.enoughBorder,
          enough_bg: renderStyle.enoughBgColor || renderStyle.enoughGradient,
          low_bg: renderStyle.lowBgColor || renderStyle.lowGradient,
          empty_bg: renderStyle.emptyBgColor || renderStyle.emptyGradient,
          close_bg: renderStyle.closeBgColor || renderStyle.closeGradient,
          remainDisp: renderStyle.remainDisp,
          restDisp: renderStyle.restDisp
        }
      });
      //日毎データを確保
      monthDailyObj = calendarInfoObj.dailyStats;

      //カレンダーテーブルの再レンダリング
      const calendarTableElement = $calendarTable[0] || null;
      (0,_createTableSource__WEBPACK_IMPORTED_MODULE_4__.renderTableFromTableSource)(calendarTableElement, calendarSource);

      //予約済みテーブルの処理
      if (itmar_option.isLoggedIn) {
        try {
          //予約済みデータの取得
          const bookingPath = `/itmar/v1/get_user_bookings?resource_id=${resourceId}`;
          const bookings = await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
            path: bookingPath
          });
          // 予約一覧用の Source を作成
          const bookingSource = (0,_createTableSource__WEBPACK_IMPORTED_MODULE_4__.buildBookingListTableSource)(bookings, {
            renderActions: _createTableSource__WEBPACK_IMPORTED_MODULE_4__.renderCancelButtonHtml
          });
          //テーブルの再レンダリング
          const bookingTableElement = $bookingTable[0] || null;
          (0,_createTableSource__WEBPACK_IMPORTED_MODULE_4__.renderTableFromTableSource)(bookingTableElement, bookingSource);
        } catch (err) {
          console.error(err.message);
        }
      }
    }

    // リソース情報を取得する関数

    const fetchResourceTitle = async id => {
      try {
        // resourceId を使って投稿情報を取得
        const post = await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
          path: `/wp/v2/${resourceRest}/${id}`
        });
        return post.title.rendered;
      } catch (error) {
        console.error("リソース名の取得に失敗しました:", error);
      }
    };

    // 「親の親」にある #reservation_modal を探して表示させる
    const $reservation_modal = $root.find(`#${confirmModal}`).parent().parent();

    // $calendarTable 内のセル（td）がクリックされた時のイベント（予約登録）
    $calendarTable.on("click", "td", function () {
      //選択された月を取得
      const selectedMonth = $calendar.find(MONTH_SELECT).val(); // "YYYY/MM"
      if (!selectedMonth) return;
      const $clickedCell = $(this);
      const selDateNum = Number($clickedCell.data("date"));

      //その日の予定がなければ終了
      if (!monthDailyObj[selDateNum]) return;

      // 1. テーブル内のすべての td から "currentSel" クラスを一旦削除
      $calendarTable.find("td").removeClass("currentSel");

      // 2. クリックされたセル（this）だけに "currentSel" クラスを追加
      $clickedCell.addClass("currentSel");

      //時間単位の情報が複数あるなら時間テーブルを表示して終了
      if (Object.keys(monthDailyObj[selDateNum]).length > 1) {
        const timeStyle = {
          isDispHoliday: renderStyle.isHoliday,
          enoughBorder: renderStyle.enoughBorder,
          enough_bg: renderStyle.enoughBgColor || renderStyle.enoughGradient,
          low_bg: renderStyle.lowBgColor || renderStyle.lowGradient,
          empty_bg: renderStyle.emptyBgColor || renderStyle.emptyGradient,
          close_bg: renderStyle.closeBgColor || renderStyle.closeGradient,
          remainDisp: renderStyle.remainDisp
        };
        const timetableSource = (0,_createTableSource__WEBPACK_IMPORTED_MODULE_4__.buildTimeTableSource)(monthDailyObj[selDateNum], timeStyle);

        //テーブルの再レンダリング
        const timeTableElement = $timeTable[0] || null;
        (0,_createTableSource__WEBPACK_IMPORTED_MODULE_4__.renderTableFromTableSource)(timeTableElement, timetableSource);
        //timeTableを表示
        $timeTable.show();
        return;
      } else {
        //結合して YYYY-MM-DD 完成
        const yearMonth = selectedMonth.replace(/\//g, "-");
        const selDay = $calendarTable.find("td.currentSel").data("date");
        const dayPadded = String(selDay).padStart(2, "0");
        const formattedDate = `${yearMonth}-${dayPadded}`;
        //モーダルを出す
        comfirm_modal_disp(formattedDate);
      }
    });

    // $timeTable 内のセル（td）がクリックされた時のイベント（予約登録）
    $timeTable.on("click", "td", function () {
      //選択された月を取得
      const selectedMonth = $calendar.find(MONTH_SELECT).val(); // "YYYY/MM"
      if (!selectedMonth) return;
      //選択された日付
      if (!$calendarTable.find("td.currentSel").length) return;
      const selDay = $calendarTable.find("td.currentSel").data("date");
      //空きがないときは終了
      const $clickedCell = $(this);
      if ($clickedCell.data("avail") < 1) return;

      //日付文字列の生成
      // 1. スラッシュをハイフンに置換 (2026/05 -> 2026-05)
      const yearMonth = selectedMonth.replace(/\//g, "-");

      // 2. 日付を2桁にパディング (5 -> 05)
      const dayPadded = String(selDay).padStart(2, "0");

      // 3. 結合して YYYY-MM-DD 完成
      const formattedDate = `${yearMonth}-${dayPadded}`;
      //モーダルを出す
      comfirm_modal_disp(formattedDate, $clickedCell.data("time"));
    });

    //予約確認のモーダルを出す
    const comfirm_modal_disp = async (selDate, timeValue = "") => {
      //モーダル内の日付表示要素を取得
      if (dispUniqueIds.reserveDate) {
        const dateId = JSON.parse(dispUniqueIds.reserveDate).id;
        const $dateElm = $reservation_modal.find(`[data-unique_id=${dateId}]`);

        //フォーマットを当てて表示
        const formatedValue = (0,itmar_block_packages__WEBPACK_IMPORTED_MODULE_3__.displayFormated)(selDate, $dateElm.data("user_format"), $dateElm.data("free_format"), $dateElm.data("decimal"));
        if ($dateElm) {
          enterTitle($dateElm, formatedValue);
          $dateElm.attr("data-value", selDate);
        }
      }

      //モーダル内の時間表示要素を取得
      if (dispUniqueIds.reserveTime) {
        const timeId = JSON.parse(dispUniqueIds.reserveTime).id;
        const $timeElm = $reservation_modal.find(`[data-unique_id=${timeId}]`);
        if ($timeElm) {
          enterTitle($timeElm, timeValue);
          $timeElm.attr("data-value", timeValue);
        }
      }

      //リソース名を表示
      if (dispUniqueIds.resourceName) {
        const resourceId = JSON.parse(dispUniqueIds.resourceName).id;
        const $resouceElm = $reservation_modal.find(`[data-unique_id=${resourceId}]`);
        if ($resouceElm) {
          enterTitle($resouceElm, resourceName);
        }
      }

      //予約人数の初期値をinputboxの値に入れる
      if (dispUniqueIds.guestCount) {
        const guestCountId = JSON.parse(dispUniqueIds.guestCount).id;
        const $guestCountInput = $reservation_modal.find(`#${guestCountId}`);
        $guestCountInput.val(1);
      }

      //ログインのチェック
      if (!itmar_option.isLoggedIn) {
        alert("予約にはログインが必要です。");
        // 必要ならログインページへリダイレクト
        // window.location.href = wpApiSettings.login_url;
        return;
      }
      if ($reservation_modal.length) {
        //メール送信ブロックがあるか検証
        const mailSenderBlock = $reservation_modal.find(".wp-block-itmar-contactmail-sender");
        // メールセンダーブロックにイベントを送信
        if (mailSenderBlock) {
          mailSenderBlock.trigger("fieldset:action", {
            type: cancelModForm
          });
        }
        // モーダルを表示（CSSで display: none になっている場合）
        $reservation_modal.fadeIn();
      } else {
        console.error("モーダルが見つかりません。IDを確認してください。");
      }
    };

    // $bookingTable 内のキャンセルボタンがクリックされた時のイベント（キャンセル確認のモーダルを出す）
    $bookingTable.on("click", ".itmar-cancel-button", async function (e) {
      //メール送信ブロックがあるか検証
      if ($reservation_modal.length < 1) {
        console.error("モーダルが見つかりません。IDを確認してください。");
        return;
      }
      const mailSenderBlock = $reservation_modal.find(".wp-block-itmar-contactmail-sender");
      // 一つ目を表示、それ以外を非表示にしてリセット
      if (mailSenderBlock) {
        mailSenderBlock.trigger("fieldset:action", {
          type: reserveForm
        });
      }

      // 1. クリックされたボタンから見て、所属している「行(tr)」を取得
      const $td = $(e.currentTarget).closest("td");
      const bookingId = $td.data("booking-id");
      const slotIds = $td.data("slot-ids");
      const reserveDate = $td.data("reserve-date");
      const guestCount = $td.data("guest-count");

      // クリックされたボタンから見て、所属している「行(tr)」を取得
      const $row = $(e.currentTarget).closest("tr");

      //モーダル内の表示要素を取得して表示
      if (dispUniqueIds.reserveDate) {
        const dateId = JSON.parse(dispUniqueIds.reserveDate).id;
        const $dateElm = $reservation_modal.find(`[data-unique_id=${dateId}]`);

        //フォーマットを当てて表示
        const formatedValue = (0,itmar_block_packages__WEBPACK_IMPORTED_MODULE_3__.displayFormated)(reserveDate, $dateElm.data("user_format"), $dateElm.data("free_format"), $dateElm.data("decimal"));
        enterTitle($dateElm, formatedValue);
      }
      if (dispUniqueIds.reserveTime) {
        const timeId = JSON.parse(dispUniqueIds.reserveTime).id;
        const $timeElm = $reservation_modal.find(`[data-unique_id=${timeId}]`);
        const timeText = $row.find("td.reservation_time_cell").text().trim();
        enterTitle($timeElm, timeText);
      }

      //予約人数をinputboxの値に入れる
      if (dispUniqueIds.guestCount) {
        const guestCountId = JSON.parse(dispUniqueIds.guestCount).id;
        const $guestCountInput = $reservation_modal.find(`#${guestCountId}`);

        // 正規表現で数字以外（\D）をすべて空文字に置換し、数値型に変換
        const guestCountInt = parseInt(guestCount, 10);
        $guestCountInput.val(guestCountInt);
        $guestCountInput.data("prev_value", guestCountInt); //初期値をデータ属性で確保しておく
      }

      //キャンセル処理に必要なIDをモーダルに記録
      $reservation_modal.data("booking-id", bookingId);
      $reservation_modal.data("slot-ids", slotIds);
      $reservation_modal.fadeIn();
    });

    //確認モーダルのサブミット
    let click_key = "";
    $reservation_modal.on("submit", "form", async function (e) {
      e.preventDefault(); // ページ遷移を止める
      //サブミッタがないときは処理しない
      if (!e.originalEvent) return;
      //submitボタンの取得
      const $form = $(this);
      const $submitBtn = $form.find('button[type="submit"]');
      const keepBtnTexts = $submitBtn.map(function () {
        return $(this).text();
      }).get();

      //ボタンのキー属性によって処理する
      //予約の実行
      if ($form.attr("id") === "to_confirm_form") {
        //確認前のフォームでクリックされたボタンIDをキープ
        click_key = e.originalEvent?.submitter?.dataset.key;
      } else if ($form.attr("id") === "itmar_send_exec") {
        //戻るの処理
        const pageDirection = e.originalEvent.submitter?.dataset.back;
        if (pageDirection === "back") {
          return;
        }

        // ✅ モーダルに保存しておいた ID を取得
        const $modalElement = $form.closest($reservation_modal);
        const bookingId = $modalElement.data("booking-id");

        // ボタンを無効化して連打防止
        //const keepBtnText = $submitBtn.text();
        $submitBtn.prop("disabled", true).text((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)("Sending...", "itmaroon-booking-block"));
        const $data_form = $(this) // submit された form 要素
        .parent() // その直親（.figure_fieldset）
        .prev() // その直前の兄弟要素
        .find(
        // その中から
        "#to_confirm_form" // ID が to_confirm_form の要素を取得
        );

        // フォーム内のデータを取得
        let guestCount = 0;
        let reserveDate = "";
        let reserveTime = "";
        if (dispUniqueIds.guestCount) {
          const guestCountId = JSON.parse(dispUniqueIds.guestCount).id;
          guestCount = $data_form?.find(`input[name=${guestCountId}]`).val();
        }
        const isSameUnit = $data_form?.find('input[name="same_table"]').prop("checked") || false;
        if (dispUniqueIds.reserveDate) {
          const dateId = JSON.parse(dispUniqueIds.reserveDate).id;
          reserveDate = $data_form?.find(`[data-unique_id=${dateId}]`)?.attr("data-value");
        }
        if (dispUniqueIds.reserveTime) {
          const timeId = JSON.parse(dispUniqueIds.reserveTime).id;
          reserveTime = $data_form?.find(`[data-unique_id=${timeId}]`)?.attr("data-value") || "00:00";
        }

        //予約実行の結果を入れる
        let message = {
          code: "error",
          text: infoMessages["error"]
        };
        try {
          // ボタンを無効化して連打防止
          $submitBtn.prop("disabled", true).text((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)("Sending...", "itmaroon-booking-block"));

          //予約の実行
          if (click_key === buttonIDs.reserve) {
            // 送信データを作成
            const data = {
              resource_id: resourceId,
              guest_count: guestCount,
              is_same_unit: isSameUnit,
              reserveDate: reserveDate,
              reserveTime: reserveTime
            };
            const response = await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
              path: "/itmar/v1/bookings",
              method: "POST",
              data: data
            });
            message = {
              code: response.info_code,
              text: infoMessages[response.info_code]
            };
            if (message.text) {
              alert(message.text);
            } else {
              // 万が一、該当するコードのメッセージが定義されていない場合のフォールバック
              alert((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)("Operation Complete", "itmaroon-booking-block"));
            }

            //修正の実行
          } else if (click_key === buttonIDs.modify) {
            // 送信データを作成
            const data = {
              id: bookingId,
              is_same_unit: isSameUnit,
              guest_count: guestCount
            };
            const response = await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
              path: "/itmar/v1/change_booking",
              method: "POST",
              data: data
            });
            message = {
              code: response.info_code,
              text: infoMessages[response.info_code]
            };
            if (message.text) {
              alert(message.text);
            } else {
              // 万が一、該当するコードのメッセージが定義されていない場合のフォールバック
              alert((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)("Operation Complete", "itmaroon-booking-block"));
            }

            //キャンセルの実行
          } else if (click_key === buttonIDs.cancel) {
            // 送信データを作成
            const data = {
              id: bookingId,
              is_same_unit: isSameUnit,
              guest_count: guestCount
            };
            const response = await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
              path: "/itmar/v1/cancel_booking",
              method: "POST",
              data: data
            });
            message = {
              code: response.info_code,
              text: infoMessages[response.info_code]
            };
            if (message.text) {
              alert(message.text);
            } else {
              // 万が一、該当するコードのメッセージが定義されていない場合のフォールバック
              alert((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)("Operation Complete", "itmaroon-booking-block"));
            }
          }
        } catch (error) {
          console.error("予約エラー:", error.message);
          message = {
            code: error.info_code,
            text: infoMessages[error.info_code] ? infoMessages[error.info_code] : error.message
          };

          // error が Error オブジェクトかどうかをチェック
          if (message) {
            alert(message.text);
          } else {
            alert("不明なエラーが発生しました");
          }
        } finally {
          // 送信後：各ボタンのテキストを個別に復元
          $submitBtn.each(function (index) {
            $(this).prop("disabled", false).text(keepBtnTexts[index]);
          });
          //再レンダリングの実行
          if (typeof refresh === "function") {
            refresh();
          }
          if (message.code === "noChange") {
            //モーダルの消去
            $reservation_modal.fadeOut();
          } else {
            //通知メールの送信トリガー発行
            $("#itmar_send_exec").trigger("submit", {
              message: message
            });
          }
        }
      }
    });
  });
});
})();

/******/ })()
;
//# sourceMappingURL=view.js.map
>>>>>>> c2acbc763d25d8fe66b5fb35ce62b1545bcebe19
