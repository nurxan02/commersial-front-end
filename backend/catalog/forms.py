from django import forms
from django.utils.safestring import mark_safe
from django.utils.html import escape
import json


class _BaseJSONListWidget(forms.Widget):
    template_name = None

    def _serialize(self, value):
        if value in (None, ""):
            return []
        if isinstance(value, str):
            try:
                return json.loads(value) or []
            except Exception:
                return []
        if isinstance(value, list):
            return value
        return []

    def render(self, name, value, attrs=None, renderer=None):
        raise NotImplementedError


class KeyValueListWidget(_BaseJSONListWidget):
    def render(self, name, value, attrs=None, renderer=None):
        items = self._serialize(value)
        hidden_id = (attrs or {}).get("id", f"id_{name}")
        hidden_value = escape(json.dumps(items))
        template = '''
<div class="kv-widget" id="__HID___wrapper">
  <input type="hidden" name="__NAME__" id="__HID__" value='__VAL__' />
  <div class="kv-rows"></div>
  <button type="button" class="kv-add">Sətir əlavə et</button>
</div>
<script>(function(){
  const wrap = document.getElementById('__HID___wrapper');
  if(!wrap || wrap.dataset.initialized) return; wrap.dataset.initialized = '1';
  const hidden = document.getElementById('__HID__');
  const rows = wrap.querySelector('.kv-rows');
  function read(){
    const arr = [];
    rows.querySelectorAll('.kv-row').forEach(r=>{
      const k = r.querySelector('.kv-key').value.trim();
      const v = r.querySelector('.kv-value').value.trim();
      if(k || v) arr.push({label:k, value:v});
    });
    hidden.value = JSON.stringify(arr);
  }
  function addRow(data){
    const div = document.createElement('div');
    div.className='kv-row';
    div.innerHTML = '<input type="text" class="kv-key" placeholder="Key" /> '
      + '<input type="text" class="kv-value" placeholder="Value" /> '
      + '<button type="button" class="kv-remove">Sil</button>';
    rows.appendChild(div);
    if(data){
      div.querySelector('.kv-key').value = data.label||'';
      div.querySelector('.kv-value').value = data.value||'';
    }
    div.querySelectorAll('input').forEach(inp=> inp.addEventListener('input', read));
    div.querySelector('.kv-remove').addEventListener('click', ()=>{ div.remove(); read(); });
  }
  rows.innerHTML = '';
  try{ (JSON.parse(hidden.value)||[]).forEach(addRow); }catch(e){}
  wrap.querySelector('.kv-add').addEventListener('click', function(){ addRow(); read(); });
  read();
})();</script>
<style>
  .kv-widget .kv-row{ margin-bottom:6px; }
  .kv-widget .kv-row .kv-key{ width:200px; }
  .kv-widget .kv-row .kv-value{ width:300px; margin-left:6px; }
  .kv-widget .kv-row .kv-remove{ margin-left:6px; }
  .kv-widget .kv-add{ margin-top:6px; }
</style>
        '''
        html = (template
                .replace('__HID__', hidden_id)
                .replace('__NAME__', name)
                .replace('__VAL__', hidden_value))
        return mark_safe(html)


class TextListWidget(_BaseJSONListWidget):
    def render(self, name, value, attrs=None, renderer=None):
        items = self._serialize(value)
        hidden_id = (attrs or {}).get("id", f"id_{name}")
        hidden_value = escape(json.dumps([
            (i if isinstance(i, dict) else {"text": i}) for i in items
        ]))
        template = '''
<div class="txt-widget" id="__HID___wrapper">
  <input type="hidden" name="__NAME__" id="__HID__" value='__VAL__' />
  <div class="txt-rows"></div>
  <button type="button" class="txt-add">Sətir əlavə et</button>
</div>
<script>(function(){
  const wrap = document.getElementById('__HID___wrapper');
  if(!wrap || wrap.dataset.initialized) return; wrap.dataset.initialized = '1';
  const hidden = document.getElementById('__HID__');
  const rows = wrap.querySelector('.txt-rows');
  function read(){
    const arr = [];
    rows.querySelectorAll('.txt-row').forEach(r=>{
      const t = r.querySelector('.txt-value').value.trim();
      if(t) arr.push({text:t});
    });
    hidden.value = JSON.stringify(arr);
  }
  function addRow(data){
    const div = document.createElement('div');
    div.className='txt-row';
    div.innerHTML = '<input type="text" class="txt-value" placeholder="Mətni daxil edin" /> '
      + '<button type="button" class="txt-remove">Sil</button>';
    rows.appendChild(div);
    if(data) div.querySelector('.txt-value').value = data.text||'';
    div.querySelector('.txt-value').addEventListener('input', read);
    div.querySelector('.txt-remove').addEventListener('click', ()=>{ div.remove(); read(); });
  }
  rows.innerHTML = '';
  try{ (JSON.parse(hidden.value)||[]).forEach(addRow); }catch(e){}
  wrap.querySelector('.txt-add').addEventListener('click', function(){ addRow(); read(); });
  read();
})();</script>
<style>
  .txt-widget .txt-row{ margin-bottom:6px; }
  .txt-widget .txt-row .txt-value{ width:520px; }
  .txt-widget .txt-row .txt-remove{ margin-left:6px; }
  .txt-widget .txt-add{ margin-top:6px; }
</style>
        '''
        html = (template
                .replace('__HID__', hidden_id)
                .replace('__NAME__', name)
                .replace('__VAL__', hidden_value))
        return mark_safe(html)


class NumberTextListWidget(_BaseJSONListWidget):
    def render(self, name, value, attrs=None, renderer=None):
        items = self._serialize(value)
        hidden_id = (attrs or {}).get("id", f"id_{name}")
        hidden_value = escape(json.dumps(items))
        template = '''
<div class="nt-widget" id="__HID___wrapper">
  <input type="hidden" name="__NAME__" id="__HID__" value='__VAL__' />
  <div class="nt-rows"></div>
  <button type="button" class="nt-add">Sətir əlavə et</button>
</div>
<script>(function(){
  const wrap = document.getElementById('__HID___wrapper');
  if(!wrap || wrap.dataset.initialized) return; wrap.dataset.initialized = '1';
  const hidden = document.getElementById('__HID__');
  const rows = wrap.querySelector('.nt-rows');
  function read(){
    const arr = [];
    rows.querySelectorAll('.nt-row').forEach(r=>{
      const n = r.querySelector('.nt-number').value;
      const t = r.querySelector('.nt-text').value.trim();
      if(n || t) arr.push({number: (n? parseInt(n,10): null), text:t});
    });
    hidden.value = JSON.stringify(arr);
  }
  function addRow(data){
    const div = document.createElement('div');
    div.className='nt-row';
    div.innerHTML = '<input type="number" class="nt-number" placeholder="Number" style="width:120px"/> '
      + '<input type="text" class="nt-text" placeholder="Text" style="width:380px"/> '
      + '<button type="button" class="nt-remove">Sil</button>';
    rows.appendChild(div);
    if(data){
      if(data.number!==undefined && data.number!==null) div.querySelector('.nt-number').value = data.number;
      div.querySelector('.nt-text').value = data.text||'';
    }
    div.querySelectorAll('input').forEach(inp=> inp.addEventListener('input', read));
    div.querySelector('.nt-remove').addEventListener('click', ()=>{ div.remove(); read(); });
  }
  rows.innerHTML = '';
  try{ (JSON.parse(hidden.value)||[]).forEach(addRow); }catch(e){}
  wrap.querySelector('.nt-add').addEventListener('click', function(){ addRow(); read(); });
  read();
})();</script>
<style>
  .nt-widget .nt-row{ margin-bottom:6px; }
  .nt-widget .nt-remove{ margin-left:6px; }
  .nt-widget .nt-add{ margin-top:6px; }
  .nt-widget input{ margin-right:6px; }
</style>
        '''
        html = (template
                .replace('__HID__', hidden_id)
                .replace('__NAME__', name)
                .replace('__VAL__', hidden_value))
        return mark_safe(html)


class ProductAdminForm(forms.ModelForm):
    class Meta:
        from .models import Product
        model = Product
        fields = "__all__"
        widgets = {
            "specs": KeyValueListWidget(),
            "features": TextListWidget(),
            "highlights": NumberTextListWidget(),
        }
