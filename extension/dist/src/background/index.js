(function(){"use strict";chrome.runtime.onInstalled.addListener(()=>{console.log("FormPilot installed")}),chrome.runtime.onMessage.addListener((e,t,n)=>{e.type==="PING"&&n({ok:!0})})})();
