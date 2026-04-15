/* =============================================================
   Cloudinary Unsigned Upload Utility — ישיר שיווק והפצה
   מחובר ל-Cloud: dmqjap7r1
   SECURITY: משתמש רק ב-Cloud Name + Unsigned Preset.
   ⚠ ה-API Secret לא מופיע כאן ולעולם לא יופיע ב-Frontend.
   =============================================================
   דרישה חד-פעמית: צור Unsigned Upload Preset בדאשבורד קלאודינרי:
     Settings → Upload → Upload presets → Add preset
     Name: yashir_products | Signing mode: Unsigned → Save
   ============================================================= */

var CloudinaryUpload = {

  CLOUD_NAME: 'dmqjap7r1',
  PRESET:     'yashir_products',
  FOLDER:     'yashir/products',

  /* URL לאופטימיזציה אוטומטית של תמונות מוצרים בקטלוג */
  buildCatalogUrl: function (publicIdOrUrl) {
    if (!publicIdOrUrl) return null;
    /* אם כבר URL מלא — החלף את /upload/ בטרנספורמציות */
    if (publicIdOrUrl.startsWith('http')) {
      return publicIdOrUrl.replace('/upload/', '/upload/w_400,h_300,c_fill,q_auto,f_auto/');
    }
    return 'https://res.cloudinary.com/' + CloudinaryUpload.CLOUD_NAME +
           '/image/upload/w_400,h_300,c_fill,q_auto,f_auto/' + publicIdOrUrl;
  },

  /* URL לתצוגה מקדימה קטנה בפאנל ניהול */
  buildThumbUrl: function (publicIdOrUrl) {
    if (!publicIdOrUrl) return null;
    if (publicIdOrUrl.startsWith('http')) {
      return publicIdOrUrl.replace('/upload/', '/upload/w_80,h_60,c_fill,q_auto,f_auto/');
    }
    return 'https://res.cloudinary.com/' + CloudinaryUpload.CLOUD_NAME +
           '/image/upload/w_80,h_60,c_fill,q_auto,f_auto/' + publicIdOrUrl;
  },

  /*
   * upload(file, callbacks)
   * callbacks: { onProgress(pct), onSuccess(url, publicId), onError(msg) }
   */
  upload: function (file, callbacks) {
    callbacks = callbacks || {};

    /* בדיקות בסיסיות */
    if (!file) { if (callbacks.onError) callbacks.onError('לא נבחר קובץ'); return; }
    if (!file.type.startsWith('image/')) { if (callbacks.onError) callbacks.onError('יש לבחור קובץ תמונה'); return; }
    if (file.size > 10 * 1024 * 1024) { if (callbacks.onError) callbacks.onError('גודל מקסימלי: 10MB'); return; }

    var formData = new FormData();
    formData.append('file',           file);
    formData.append('upload_preset',  CloudinaryUpload.PRESET);
    formData.append('folder',         CloudinaryUpload.FOLDER);

    var xhr = new XMLHttpRequest();
    var url = 'https://api.cloudinary.com/v1_1/' + CloudinaryUpload.CLOUD_NAME + '/image/upload';
    xhr.open('POST', url, true);

    /* progress */
    xhr.upload.addEventListener('progress', function (e) {
      if (e.lengthComputable && callbacks.onProgress) {
        callbacks.onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    /* success / error */
    xhr.addEventListener('load', function () {
      try {
        var data = JSON.parse(xhr.responseText);
        if (xhr.status === 200 && data.secure_url) {
          var optimizedUrl = data.secure_url.replace('/upload/', '/upload/q_auto,f_auto/');
          if (callbacks.onSuccess) callbacks.onSuccess(optimizedUrl, data.public_id);
        } else {
          var msg = (data.error && data.error.message) ? data.error.message : 'שגיאה לא ידועה בהעלאה';
          if (msg.indexOf('preset') > -1) {
            msg = 'Preset לא נמצא — ודא שיצרת Unsigned Preset בשם "yashir_products" בקלאודינרי';
          }
          if (callbacks.onError) callbacks.onError(msg);
        }
      } catch (e) {
        if (callbacks.onError) callbacks.onError('תגובה לא תקינה מהשרת');
      }
    });

    xhr.addEventListener('error', function () {
      if (callbacks.onError) callbacks.onError('שגיאת רשת — בדוק חיבור אינטרנט');
    });

    xhr.send(formData);
  }
};
