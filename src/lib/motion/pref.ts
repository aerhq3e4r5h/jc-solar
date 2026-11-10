// How much the site moves. Three levels:
//   full  everything: parallax, slides, things that fly
//   calm  gentle: fades, colour, slow tickers; nothing slides, zooms or flies
//   off   nothing animates at all
// A visitor's own choice (the Motion menu) wins. Until they choose, the device
// decides: "reduce motion" on the device means calm, otherwise full.

export type MotionPref = "full" | "calm" | "off";
export type MotionChoice = MotionPref | "auto";

export const MOTION_KEY = "ga-motion";
/** Fired on window when the level changes (the choice, or the device setting). */
export const MOTION_EVENT = "ga-motion";

/**
 * Runs as the page is parsed, before anything paints, so there is no flash:
 *  1. puts the level on <html data-motion>, for the stylesheet and components;
 *  2. flags <html data-motion-hint> when the device, not the visitor, chose calm;
 *  3. marks [data-reveal] elements data-shown as they scroll into view (and
 *     staggers ones that arrive together), independent of React.
 * Without JavaScript none of this runs and everything is simply visible.
 */
export const MOTION_SCRIPT = `(function(){var d=document.documentElement,q=window.matchMedia("(prefers-reduced-motion: reduce)");function g(){try{return localStorage.getItem("${MOTION_KEY}")}catch(e){return null}}function p(){var s=g(),c=s==="full"||s==="calm"||s==="off";d.dataset.motion=c?s:q.matches?"calm":"full";if(!c&&q.matches)d.dataset.motionHint="";else delete d.dataset.motionHint}p();var f=function(){p();window.dispatchEvent(new Event("${MOTION_EVENT}"))};q.addEventListener?q.addEventListener("change",f):q.addListener(f);if(!("IntersectionObserver" in window)||!("MutationObserver" in window))return;d.dataset.io="";var io=new IntersectionObserver(function(es){var n=0;for(var i=0;i<es.length;i++){var e=es[i];if(!e.isIntersecting)continue;var el=e.target;io.unobserve(el);if(!el.style.getPropertyValue("--i"))el.style.setProperty("--rd",Math.min(n++,8)*70+"ms");el.setAttribute("data-shown","")}},{rootMargin:"0px 0px -7% 0px"});function s(r){if(r.nodeType!==1)return;if(r.hasAttribute("data-reveal")&&!r.hasAttribute("data-shown"))io.observe(r);var l=r.querySelectorAll("[data-reveal]:not([data-shown])");for(var i=0;i<l.length;i++)io.observe(l[i])}new MutationObserver(function(ms){for(var i=0;i<ms.length;i++)for(var j=0;j<ms[i].addedNodes.length;j++)s(ms[i].addedNodes[j])}).observe(d,{childList:true,subtree:true})})()`;
