from django import forms
from django.utils.safestring import mark_safe
from django.utils.html import escape
import json
from unfold.contrib.forms.widgets import WysiwygWidget

# Reuse widgets from catalog if available; fallback to local versions
try:
  from catalog.forms import (
    TextListWidget as CatalogTextListWidget,
    KeyValueListWidget as CatalogKeyValueListWidget,
  )
except Exception:  # pragma: no cover
  CatalogTextListWidget = None
  CatalogKeyValueListWidget = None


class _BaseJSONListWidget(forms.Widget):
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


# Fallback Key/Value widget if catalog's is unavailable
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
    div.innerHTML = '<input type="text" class="kv-key" placeholder="Açar (məs. gün)" /> '
      + '<input type="text" class="kv-value" placeholder="Dəyər (məs. saat)" /> '
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
  .kv-widget .kv-row .kv-key{ width:220px; }
  .kv-widget .kv-row .kv-value{ width:360px; margin-left:6px; }
  .kv-widget .kv-row .kv-remove{ margin-left:6px; }
  .kv-widget .kv-add{ margin-top:6px; }
</style>
        '''
        html = (template
                .replace('__HID__', hidden_id)
                .replace('__NAME__', name)
                .replace('__VAL__', hidden_value))
        return mark_safe(html)


class IconTitleTextListWidget(_BaseJSONListWidget):
    """Renders list of items as [{icon, title, text}, ...]."""

    def render(self, name, value, attrs=None, renderer=None):
        items = self._serialize(value)
        hidden_id = (attrs or {}).get("id", f"id_{name}")
        hidden_value = escape(json.dumps(items))
        template = '''
<div class="itt-widget" id="__HID___wrapper">
  <input type="hidden" name="__NAME__" id="__HID__" value='__VAL__' />
  <div class="itt-rows"></div>
  <button type="button" class="itt-add">Sətir əlavə et</button>
</div>
<script>(function(){
  const wrap = document.getElementById('__HID___wrapper');
  if(!wrap || wrap.dataset.initialized) return; wrap.dataset.initialized = '1';
  const hidden = document.getElementById('__HID__');
  const rows = wrap.querySelector('.itt-rows');
  function read(){
    const arr = [];
    rows.querySelectorAll('.itt-row').forEach(r=>{
      const icon = r.querySelector('.itt-icon').value.trim();
      const title = r.querySelector('.itt-title').value.trim();
      const text = r.querySelector('.itt-text').value.trim();
      if(icon || title || text) arr.push({icon, title, text});
    });
    hidden.value = JSON.stringify(arr);
  }
  function addRow(data){
    const div = document.createElement('div');
    div.className='itt-row';
    div.innerHTML = '<input type="text" class="itt-icon" placeholder="Icon class (e.g. fas fa-star)" style="width:220px"/> '
      + '<input type="text" class="itt-title" placeholder="Başlıq" style="width:220px"/> '
      + '<input type="text" class="itt-text" placeholder="Mətn" style="width:340px"/> '
      + '<button type="button" class="itt-remove">Sil</button>';
    rows.appendChild(div);
    if(data){
      div.querySelector('.itt-icon').value = data.icon||'';
      div.querySelector('.itt-title').value = data.title||'';
      div.querySelector('.itt-text').value = data.text||'';
    }
    div.querySelectorAll('input').forEach(inp=> inp.addEventListener('input', read));
    div.querySelector('.itt-remove').addEventListener('click', ()=>{ div.remove(); read(); });
  }
  rows.innerHTML = '';
  try{ (JSON.parse(hidden.value)||[]).forEach(addRow); }catch(e){}
  wrap.querySelector('.itt-add').addEventListener('click', function(){ addRow(); read(); });
  read();
})();</script>
<style>
  .itt-widget .itt-row{ margin-bottom:6px; }
  .itt-widget .itt-remove{ margin-left:6px; }
  .itt-widget .itt-add{ margin-top:6px; }
</style>
        '''
        html = (template
                .replace('__HID__', hidden_id)
                .replace('__NAME__', name)
                .replace('__VAL__', hidden_value))
        return mark_safe(html)


class TitleDescriptionDetailListWidget(_BaseJSONListWidget):
    """Renders list of items as [{title, description, detail}, ...]."""

    def render(self, name, value, attrs=None, renderer=None):
        items = self._serialize(value)
        hidden_id = (attrs or {}).get("id", f"id_{name}")
        hidden_value = escape(json.dumps(items))
        template = '''
<div class="tdd-widget" id="__HID___wrapper">
  <input type="hidden" name="__NAME__" id="__HID__" value='__VAL__' />
  <div class="tdd-rows"></div>
  <button type="button" class="tdd-add">Sətir əlavə et</button>
</div>
<script>(function(){
  const wrap = document.getElementById('__HID___wrapper');
  if(!wrap || wrap.dataset.initialized) return; wrap.dataset.initialized = '1';
  const hidden = document.getElementById('__HID__');
  const rows = wrap.querySelector('.tdd-rows');
  function read(){
    const arr = [];
    rows.querySelectorAll('.tdd-row').forEach(r=>{
      const title = r.querySelector('.tdd-title').value.trim();
      const description = r.querySelector('.tdd-description').value.trim();
      const detail = r.querySelector('.tdd-detail').value.trim();
      if(title || description || detail) arr.push({title, description, detail});
    });
    hidden.value = JSON.stringify(arr);
  }
  function addRow(data){
    const div = document.createElement('div');
    div.className='tdd-row';
    div.innerHTML = '<input type="text" class="tdd-title" placeholder="Ad" style="width:220px"/> '
      + '<input type="text" class="tdd-description" placeholder="Vəzifə/Təsvir" style="width:280px"/> '
      + '<input type="text" class="tdd-detail" placeholder="Ətraflı" style="width:280px"/> '
      + '<button type="button" class="tdd-remove">Sil</button>';
    rows.appendChild(div);
    if(data){
      div.querySelector('.tdd-title').value = data.title||'';
      div.querySelector('.tdd-description').value = data.description||'';
      div.querySelector('.tdd-detail').value = data.detail||'';
    }
    div.querySelectorAll('input').forEach(inp=> inp.addEventListener('input', read));
    div.querySelector('.tdd-remove').addEventListener('click', ()=>{ div.remove(); read(); });
  }
  rows.innerHTML = '';
  try{ (JSON.parse(hidden.value)||[]).forEach(addRow); }catch(e){}
  wrap.querySelector('.tdd-add').addEventListener('click', function(){ addRow(); read(); });
  read();
})();</script>
<style>
  .tdd-widget .tdd-row{ margin-bottom:6px; }
  .tdd-widget .tdd-remove{ margin-left:6px; }
  .tdd-widget .tdd-add{ margin-top:6px; }
</style>
        '''
        html = (template
                .replace('__HID__', hidden_id)
                .replace('__NAME__', name)
                .replace('__VAL__', hidden_value))
        return mark_safe(html)


class NumberLabelListWidget(_BaseJSONListWidget):
    """Renders list of items as [{number, label}, ...]."""

    def render(self, name, value, attrs=None, renderer=None):
        items = self._serialize(value)
        hidden_id = (attrs or {}).get("id", f"id_{name}")
        hidden_value = escape(json.dumps(items))
        template = '''
<div class="nl-widget" id="__HID___wrapper">
  <input type="hidden" name="__NAME__" id="__HID__" value='__VAL__' />
  <div class="nl-rows"></div>
  <button type="button" class="nl-add">Sətir əlavə et</button>
</div>
<script>(function(){
  const wrap = document.getElementById('__HID___wrapper');
  if(!wrap || wrap.dataset.initialized) return; wrap.dataset.initialized = '1';
  const hidden = document.getElementById('__HID__');
  const rows = wrap.querySelector('.nl-rows');
  function read(){
    const arr = [];
    rows.querySelectorAll('.nl-row').forEach(r=>{
      const n = r.querySelector('.nl-number').value;
      const l = r.querySelector('.nl-label').value.trim();
      if(n || l) arr.push({number: (n? parseInt(n,10): null), label: l});
    });
    hidden.value = JSON.stringify(arr);
  }
  function addRow(data){
    const div = document.createElement('div');
    div.className='nl-row';
    div.innerHTML = '<input type="number" class="nl-number" placeholder="Say" style="width:120px"/> '
      + '<input type="text" class="nl-label" placeholder="Etiket" style="width:380px"/> '
      + '<button type="button" class="nl-remove">Sil</button>';
    rows.appendChild(div);
    if(data){
      if(data.number!==undefined && data.number!==null) div.querySelector('.nl-number').value = data.number;
      div.querySelector('.nl-label').value = data.label||'';
    }
    div.querySelectorAll('input').forEach(inp=> inp.addEventListener('input', read));
    div.querySelector('.nl-remove').addEventListener('click', ()=>{ div.remove(); read(); });
  }
  rows.innerHTML = '';
  try{ (JSON.parse(hidden.value)||[]).forEach(addRow); }catch(e){}
  wrap.querySelector('.nl-add').addEventListener('click', function(){ addRow(); read(); });
  read();
})();</script>
<style>
  .nl-widget .nl-row{ margin-bottom:6px; }
  .nl-widget .nl-remove{ margin-left:6px; }
  .nl-widget .nl-add{ margin-top:6px; }
</style>
        '''
        html = (template
                .replace('__HID__', hidden_id)
                .replace('__NAME__', name)
                .replace('__VAL__', hidden_value))
        return mark_safe(html)


class AboutAdminForm(forms.ModelForm):
    class Meta:
        from .models import AboutContent
        model = AboutContent
        fields = "__all__"
        widgets = {
            # Rich text fields
            "story": WysiwygWidget(),
            "mission": WysiwygWidget(),
            "vision": WysiwygWidget(),
            "technology_text": WysiwygWidget(),
            "contact_text": WysiwygWidget(),
            "values": IconTitleTextListWidget(),
            "team": TitleDescriptionDetailListWidget(),
            "technology_features": CatalogTextListWidget() if CatalogTextListWidget else forms.Textarea,
            "technology_stats": NumberLabelListWidget(),
        }


## ContactAdminForm will be defined after widget classes


class WorkingHoursListWidget(_BaseJSONListWidget):
    """[{label, time}] editor with add/remove rows."""

    def render(self, name, value, attrs=None, renderer=None):
        items = self._serialize(value)
        hidden_id = (attrs or {}).get("id", f"id_{name}")
        # Normalize legacy {label,value} into {label,time}
        norm = []
        for it in items:
            if isinstance(it, dict):
                norm.append({
                    "label": (it.get("label") or it.get("day") or it.get("key") or ""),
                    "time": (it.get("time") or it.get("value") or it.get("hours") or ""),
                })
        hidden_value = escape(json.dumps(norm or items))
        template = '''
<div class="wh-widget" id="__HID___wrapper">
  <input type="hidden" name="__NAME__" id="__HID__" value='__VAL__' />
  <div class="wh-rows"></div>
  <button type="button" class="wh-add">Sətir əlavə et</button>
</div>
<script>(function(){
  const wrap = document.getElementById('__HID___wrapper');
  if(!wrap || wrap.dataset.initialized) return; wrap.dataset.initialized = '1';
  const hidden = document.getElementById('__HID__');
  const rows = wrap.querySelector('.wh-rows');
  function read(){
    const arr = [];
    rows.querySelectorAll('.wh-row').forEach(r=>{
      const label = r.querySelector('.wh-label').value.trim();
      const time = r.querySelector('.wh-time').value.trim();
      if(label || time) arr.push({label, time});
    });
    hidden.value = JSON.stringify(arr);
  }
  function addRow(data){
    const div = document.createElement('div');
    div.className='wh-row';
    div.innerHTML = '<input type="text" class="wh-label" placeholder="Gün/Gruplaşdırma" style="width:220px"/> '
      + '<input type="text" class="wh-time" placeholder="Saat aralığı (məs. 09:00–18:00)" style="width:360px"/> '
      + '<button type="button" class="wh-remove">Sil</button>';
    rows.appendChild(div);
    if(data){
      div.querySelector('.wh-label').value = data.label||'';
      div.querySelector('.wh-time').value = data.time||'';
    }
    div.querySelectorAll('input').forEach(inp=> inp.addEventListener('input', read));
    div.querySelector('.wh-remove').addEventListener('click', ()=>{ div.remove(); read(); });
  }
  rows.innerHTML = '';
  try{ (JSON.parse(hidden.value)||[]).forEach(addRow); }catch(e){}
  wrap.querySelector('.wh-add').addEventListener('click', function(){ addRow(); read(); });
  read();
})();</script>
<style>
  .wh-widget .wh-row{ margin-bottom:6px; }
  .wh-widget .wh-remove{ margin-left:6px; }
  .wh-widget .wh-add{ margin-top:6px; }
</style>
        '''
        html = (template
                .replace('__HID__', hidden_id)
                .replace('__NAME__', name)
                .replace('__VAL__', hidden_value))
        return mark_safe(html)


class FAQListWidget(_BaseJSONListWidget):
    """[{question, answer}] editor with add/remove rows. Accepts legacy {label,value}."""

    def render(self, name, value, attrs=None, renderer=None):
        items = self._serialize(value)
        hidden_id = (attrs or {}).get("id", f"id_{name}")
        norm = []
        for it in items:
            if isinstance(it, dict):
                norm.append({
                    "question": (it.get("question") or it.get("label") or it.get("q") or ""),
                    "answer": (it.get("answer") or it.get("value") or it.get("a") or ""),
                })
        hidden_value = escape(json.dumps(norm or items))
        template = '''
<div class="faq-widget" id="__HID___wrapper">
  <input type="hidden" name="__NAME__" id="__HID__" value='__VAL__' />
  <div class="faq-rows"></div>
  <button type="button" class="faq-add">Sətir əlavə et</button>
</div>
<script>(function(){
  const wrap = document.getElementById('__HID___wrapper');
  if(!wrap || wrap.dataset.initialized) return; wrap.dataset.initialized = '1';
  const hidden = document.getElementById('__HID__');
  const rows = wrap.querySelector('.faq-rows');
  function read(){
    const arr = [];
    rows.querySelectorAll('.faq-row').forEach(r=>{
      const q = r.querySelector('.faq-q').value.trim();
      const a = r.querySelector('.faq-a').value.trim();
      if(q || a) arr.push({question:q, answer:a});
    });
    hidden.value = JSON.stringify(arr);
  }
  function addRow(data){
    const div = document.createElement('div');
    div.className='faq-row';
    div.innerHTML = '<input type="text" class="faq-q" placeholder="Sual" style="width:280px"/> '
      + '<input type="text" class="faq-a" placeholder="Cavab" style="width:420px"/> '
      + '<button type="button" class="faq-remove">Sil</button>';
    rows.appendChild(div);
    if(data){
      div.querySelector('.faq-q').value = data.question||'';
      div.querySelector('.faq-a').value = data.answer||'';
    }
    div.querySelectorAll('input').forEach(inp=> inp.addEventListener('input', read));
    div.querySelector('.faq-remove').addEventListener('click', ()=>{ div.remove(); read(); });
  }
  rows.innerHTML = '';
  try{ (JSON.parse(hidden.value)||[]).forEach(addRow); }catch(e){}
  wrap.querySelector('.faq-add').addEventListener('click', function(){ addRow(); read(); });
  read();
})();</script>
<style>
  .faq-widget .faq-row{ margin-bottom:6px; }
  .faq-widget .faq-remove{ margin-left:6px; }
  .faq-widget .faq-add{ margin-top:6px; }
</style>
        '''
        html = (template
                .replace('__HID__', hidden_id)
                .replace('__NAME__', name)
                .replace('__VAL__', hidden_value))
        return mark_safe(html)


class ContactAdminForm(forms.ModelForm):
  class Meta:
    from .models import ContactContent
    model = ContactContent
    fields = "__all__"
    widgets = {
  # Rich text fields
  "hero_subtitle": WysiwygWidget(),
  "form_text": WysiwygWidget(),
  "support_text": WysiwygWidget(),
  "catalog_text": WysiwygWidget(),
      "working_hours": WorkingHoursListWidget(),
      "faqs": FAQListWidget(),
    }

