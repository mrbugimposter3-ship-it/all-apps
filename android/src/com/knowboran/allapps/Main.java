package com.knowboran.allapps;
import android.app.Activity;import android.os.Bundle;import android.os.Message;import android.webkit.*;import android.content.Intent;import android.net.Uri;
import android.view.View;import android.view.ViewGroup;import android.view.WindowManager;import android.widget.FrameLayout;
/* All Apps: WebView wrapper around https://mrbugimposter3-ship-it.github.io/all-apps/ — JS, DOM storage, autoplay, screen kept on. */
public class Main extends Activity{
static final String HOME="https://mrbugimposter3-ship-it.github.io/all-apps/";
WebView w;FrameLayout root;View full;WebChromeClient.CustomViewCallback fullCb;WebChromeClient chrome;
protected void onCreate(Bundle b){super.onCreate(b);
 getWindow().setStatusBarColor(0xff102b24);getWindow().setNavigationBarColor(0xff102b24);
 getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
 root=new FrameLayout(this);w=new WebView(this);root.addView(w,new FrameLayout.LayoutParams(-1,-1));
 w.addJavascriptInterface(new Wake(),"AndroidWake");
 WebSettings s=w.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setDatabaseEnabled(true);
 s.setMediaPlaybackRequiresUserGesture(false);s.setLoadWithOverviewMode(true);s.setUseWideViewPort(true);
 s.setSupportMultipleWindows(true);s.setJavaScriptCanOpenWindowsAutomatically(true);
 CookieManager.getInstance().setAcceptThirdPartyCookies(w,true);
 w.setWebViewClient(new WebViewClient(){
  public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){
   if(!r.isForMainFrame())return false; String u=r.getUrl().toString();
   if(u.startsWith(HOME))return false; ext(r.getUrl());return true;}
  public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError e){
   if(r.isForMainFrame())v.loadData("<body style='background:#0b1f1a;color:#eaf4ef;font:18px sans-serif;display:flex;align-items:center;justify-content:center;height:90vh;text-align:center'><div><h2>No connection</h2><p>All Apps needs the internet.</p><button onclick=\"location.href='"+HOME+"'\" style='font-size:18px;padding:12px 20px;border-radius:12px'>Retry</button></div>","text/html","utf-8");}});
 w.setWebChromeClient(chrome=new WebChromeClient(){
  /* target=_blank / window.open ("Open in new tab") -> system browser */
  public boolean onCreateWindow(WebView v,boolean dlg,boolean user,Message m){
   WebView t=new WebView(Main.this);t.setWebViewClient(new WebViewClient(){public boolean shouldOverrideUrlLoading(WebView x,WebResourceRequest r){ext(r.getUrl());return true;}});
   ((WebView.WebViewTransport)m.obj).setWebView(t);m.sendToTarget();return true;}
  public void onPermissionRequest(PermissionRequest r){r.grant(new String[]{PermissionRequest.RESOURCE_PROTECTED_MEDIA_ID});}
  public void onShowCustomView(View v,CustomViewCallback cb){full=v;fullCb=cb;root.addView(v,new FrameLayout.LayoutParams(-1,-1));w.setVisibility(View.GONE);
   getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);}
  public void onHideCustomView(){if(full!=null){root.removeView(full);full=null;}w.setVisibility(View.VISIBLE);getWindow().getDecorView().setSystemUiVisibility(0);if(fullCb!=null)fullCb.onCustomViewHidden();}});
 if(b!=null)w.restoreState(b);else w.loadUrl(HOME);
 setContentView(root);}
void ext(Uri u){try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception e){}}
protected void onSaveInstanceState(Bundle o){super.onSaveInstanceState(o);w.saveState(o);}
protected void onPause(){super.onPause();w.onPause();}
protected void onResume(){super.onResume();w.onResume();}
/* the launcher's "Keep screen on" toggle calls AndroidWake.set(bool) */
class Wake{@JavascriptInterface public void set(final boolean on){runOnUiThread(new Runnable(){public void run(){if(on)getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);}});}}
public void onBackPressed(){if(full!=null){chrome.onHideCustomView();return;}
 w.evaluateJavascript("(function(){var p=document.getElementById('panel');if(p&&!p.hidden){p.hidden=true;return 1}return 0})()",new ValueCallback<String>(){public void onReceiveValue(String v){if(!"1".equals(v))moveTaskToBack(true);}});}}
