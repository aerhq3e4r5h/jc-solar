// How much the site moves. The stylesheet and components understand three
// levels, read from <html data-motion>:
//   full  everything: parallax, slides, things that fly
//   calm  fades and colour only; nothing slides, zooms or flies
//   off   nothing animates at all
// The owner's decision is that the site always runs at "full", for every
// visitor, with no setting to change it: MOTION_LEVEL is written straight
// onto <html> in src/app/layout.tsx. Changing this one constant is all it
// takes to run the whole site at another level.

export type MotionPref = "full" | "calm" | "off";

export const MOTION_LEVEL: MotionPref = "full";

/**
 * Runs as the page is parsed, before anything paints. It marks [data-reveal]
 * elements data-shown as they scroll into view (and staggers ones that
 * arrive together), independent of React. Elements are only hidden while
 * waiting once this script is running (html[data-io]), so without
 * JavaScript everything is simply visible.
 */
export const REVEAL_SCRIPT = `(function(){var d=document.documentElement;if(!("IntersectionObserver" in window)||!("MutationObserver" in window))return;d.dataset.io="";var io=new IntersectionObserver(function(es){var n=0;for(var i=0;i<es.length;i++){var e=es[i];if(!e.isIntersecting)continue;var el=e.target;io.unobserve(el);if(!el.style.getPropertyValue("--i"))el.style.setProperty("--rd",Math.min(n++,8)*70+"ms");el.setAttribute("data-shown","")}},{rootMargin:"0px 0px -7% 0px"});function s(r){if(r.nodeType!==1)return;if(r.hasAttribute("data-reveal")&&!r.hasAttribute("data-shown"))io.observe(r);var l=r.querySelectorAll("[data-reveal]:not([data-shown])");for(var i=0;i<l.length;i++)io.observe(l[i])}new MutationObserver(function(ms){for(var i=0;i<ms.length;i++)for(var j=0;j<ms[i].addedNodes.length;j++)s(ms[i].addedNodes[j])}).observe(d,{childList:true,subtree:true})})()`;
