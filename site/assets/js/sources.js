(function(){
  var RM = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* reveal */
  if(!RM && "IntersectionObserver" in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){ e.target.classList.add("on"); io.unobserve(e.target); }
      });
    }, {threshold:.08, rootMargin:"0px 0px -6% 0px"});
    document.querySelectorAll(".rv:not(.on)").forEach(function(el){ io.observe(el); });
  } else {
    document.querySelectorAll(".rv").forEach(function(el){ el.classList.add("on"); });
  }

  /* scrollspy */
  var links = Array.prototype.slice.call(document.querySelectorAll(".side nav a"));
  var secs = links.map(function(a){ return document.querySelector(a.getAttribute("href")); }).filter(Boolean);
  if("IntersectionObserver" in window && secs.length){
    var spy = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(!e.isIntersecting) return;
        links.forEach(function(a){
          a.classList.toggle("act", a.getAttribute("href") === "#" + e.target.id);
        });
      });
    }, {rootMargin:"-15% 0px -75% 0px"});
    secs.forEach(function(s){ spy.observe(s); });
  }
})();
