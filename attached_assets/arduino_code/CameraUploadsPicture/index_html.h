#ifndef INDEX_HTML_H
#define INDEX_HTML_H

const char index_html[] = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>ESP32 Camera</title><style>body{margin:0;padding:0;background:#000;display:flex;justify-content:center;align-items:center;min-height:100vh}#photo{max-width:100%;max-height:100vh;display:block}</style></head><body><img id=\"photo\" src=\"/capture\"><script>setInterval(function(){document.getElementById('photo').src='/capture?t='+Date.now()},1000);</script></body></html>";

#endif