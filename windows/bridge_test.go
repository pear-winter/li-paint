package main
import("testing";"net/http";"net/http/httptest";"testing/fstest";"strings";"encoding/json";"encoding/base64";"os";"path/filepath")
func TestBridge(t *testing.T){
 dir:=t.TempDir();h:=desktopHandler(fstest.MapFS{"index.html":{Data:[]byte("atelier")}},"nonce",dir)
 call:=func(path,nonce,origin,body string)*httptest.ResponseRecorder{r:=httptest.NewRequest("POST",desktopOrigin+path,strings.NewReader(body));r.Header.Set("X-Pear-Nonce",nonce);r.Header.Set("Origin",origin);w:=httptest.NewRecorder();h.ServeHTTP(w,r);return w}
 if call("/desktop/save","wrong",desktopOrigin,"{}").Code!=403{t.Fatal("missing nonce protection")}
 if call("/desktop/save","nonce","https://other.example","{}").Code!=403{t.Fatal("missing origin protection")}
 if call("/desktop/request","nonce",desktopOrigin,`{"url":"http://example.com","method":"GET"}`).Code!=400{t.Fatal("HTTP accepted")}
 upstream:=httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){if r.Header.Get("Authorization")!="Bearer test"{t.Error("auth not forwarded")};w.Header().Set("Content-Type","application/zip");w.Write([]byte{1,2,3})}));defer upstream.Close()
 previous:=httpClient;httpClient=upstream.Client();defer func(){httpClient=previous}()
 payload,_:=json.Marshal(map[string]any{"url":upstream.URL,"method":"POST","body":"{}","headers":map[string]string{"Authorization":"Bearer test"}})
 result:=call("/desktop/request","nonce",desktopOrigin,string(payload));if result.Code!=200||result.Body.String()!=string([]byte{1,2,3}){t.Fatal("binary request failed",result.Code)}
 save,_:=json.Marshal(map[string]string{"name":"../test.png","data":base64.StdEncoding.EncodeToString([]byte("image"))})
 for i:=0;i<2;i++{if call("/desktop/save","nonce",desktopOrigin,string(save)).Code!=200{t.Fatal("save failed")}}
 for _,name:=range []string{"test.png","test (1).png"}{b,e:=os.ReadFile(filepath.Join(dir,name));if e!=nil||string(b)!="image"{t.Fatal("save overwrote or escaped directory")}}
}
