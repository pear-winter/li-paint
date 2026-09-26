package main

import (
 "crypto/rand"
 "crypto/subtle"
 "encoding/base64"
 "encoding/hex"
 "encoding/json"
 "fmt"
 "io"
 "io/fs"
 "net/http"
 "net/url"
 "os"
 "path/filepath"
 "strings"
 "time"
)
const desktopHost = "127.0.0.1:17866"
const desktopOrigin = "http://" + desktopHost
var httpClient = &http.Client{Timeout: 180*time.Second, CheckRedirect: func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse }}
func newNonce() string { b:=make([]byte,32);if _,err:=rand.Read(b);err!=nil{panic(err)};return hex.EncodeToString(b) }
func bridgeError(w http.ResponseWriter,s string,status int){w.Header().Set("X-Pear-Error","1");http.Error(w,s,status)}
func desktopHandler(assets fs.FS,nonce,downloadDir string) http.Handler {
 files:=http.FileServer(http.FS(assets))
 return http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  if r.Host!=desktopHost {http.Error(w,"Forbidden",403);return}
  w.Header().Set("X-Content-Type-Options","nosniff")
  w.Header().Set("Cache-Control","no-store")
  w.Header().Set("Content-Security-Policy","default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' data: blob: https:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
  if !strings.HasPrefix(r.URL.Path,"/desktop/"){files.ServeHTTP(w,r);return}
  if r.Method!="POST"||subtle.ConstantTimeCompare([]byte(r.Header.Get("X-Pear-Nonce")),[]byte(nonce))!=1||(r.Header.Get("Origin")!=""&&r.Header.Get("Origin")!=desktopOrigin){bridgeError(w,"请求来源无效",403);return}
  switch r.URL.Path {
  case "/desktop/request":
   var p struct{URL,Method,Body string;Headers map[string]string}
   if json.NewDecoder(http.MaxBytesReader(w,r.Body,60<<20)).Decode(&p)!=nil{bridgeError(w,"请求过大或格式错误",400);return}
   u,e:=url.Parse(p.URL);if e!=nil||u.Scheme!="https"||u.Host==""||u.User!=nil{bridgeError(w,"接口必须使用 HTTPS",400);return}
   if p.Method!="GET"&&p.Method!="POST"{bridgeError(w,"不支持的请求方式",400);return}
   if len(p.Body)>40<<20{bridgeError(w,"请求超过 40 MB",413);return}
   req,e:=http.NewRequestWithContext(r.Context(),p.Method,u.String(),strings.NewReader(p.Body));if e!=nil{bridgeError(w,"接口地址无效",400);return}
   for k,v:=range p.Headers{switch strings.ToLower(k){case "authorization","content-type","accept":req.Header.Set(k,v)}}
   res,e:=httpClient.Do(req);if e!=nil{bridgeError(w,"连接失败或请求已取消，请检查接口地址和网络",502);return};defer res.Body.Close()
   if res.StatusCode>=300&&res.StatusCode<400{bridgeError(w,"接口重定向已拒绝，请填写最终 HTTPS 地址",502);return}
   b,e:=io.ReadAll(io.LimitReader(res.Body,(64<<20)+1));if e!=nil||len(b)>64<<20{bridgeError(w,"响应过大或接收失败",502);return}
   w.Header().Set("Content-Type",res.Header.Get("Content-Type"));w.WriteHeader(res.StatusCode);w.Write(b)
  case "/desktop/save":
   var p struct{Name,Data string};if json.NewDecoder(http.MaxBytesReader(w,r.Body,100<<20)).Decode(&p)!=nil{bridgeError(w,"文件过大或格式错误",400);return}
   b,e:=base64.StdEncoding.DecodeString(p.Data);if e!=nil{bridgeError(w,"文件数据无效",400);return}
   name:=filepath.Base(strings.ReplaceAll(p.Name,"\\","/"));name=strings.Map(func(c rune)rune{if c<32||strings.ContainsRune("<>:\"/\\|?*",c){return '_'};return c},name);name=strings.Trim(name," .");if name==""{name="pear-export"}
   if e=os.MkdirAll(downloadDir,0700);e!=nil{bridgeError(w,"无法创建下载文件夹",500);return}
   var f *os.File;var dest string
   for i:=0;i<1000;i++{candidate:=name;if i>0{ext:=filepath.Ext(name);candidate=fmt.Sprintf("%s (%d)%s",strings.TrimSuffix(name,ext),i,ext)};dest=filepath.Join(downloadDir,candidate);f,e=os.OpenFile(dest,os.O_WRONLY|os.O_CREATE|os.O_EXCL,0600);if e==nil||!os.IsExist(e){break}}
   if e!=nil{bridgeError(w,"无法保存文件",500);return};_,e=f.Write(b);ce:=f.Close();if e!=nil||ce!=nil{os.Remove(dest);bridgeError(w,"保存失败",500);return}
   w.Header().Set("Content-Type","application/json");json.NewEncoder(w).Encode(map[string]string{"path":dest})
  default:http.NotFound(w,r)
  }
 })
}
