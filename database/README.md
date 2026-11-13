# Ülgen veri tabanı teslim paketi v1

Bu paket, dokuz temel tabloyu ve sahte test verilerini backend geliştiricisinin kendi MySQL ortamında kurması içindir. Temel yapı: ESP32 → Bluetooth → Flutter → FastAPI → MySQL. Gerçek bildirim hizmeti bu paketle kurulmaz.

## Doğrulama durumu

Kullanıcının MySQL 9.4.0 ortamından paylaştığı kontrol çıktısında 14 yabancı anahtar, 9 birincil anahtar, 9 ek benzersizlik kuralı ve 37 etkin CHECK bulunuyor. schema.sql içindeki ilişki uçları ve benzersizlik/CHECK adları bu çıktıyla karşılaştırıldı ve eşleşti. Alanlar, birlikte çalıştırılan oluşturma komutları ve paylaşılan DESCRIBE sonuçları esas alınarak birleştirildi. Bu dosya canlı veritabanından alınmış mysqldump değildir.

Kullanıcı schema.sql dosyasını ayrı ulgen_import_test veritabanına yükledi ve dokuz tablonun oluştuğunu doğruladı. Ardından sample_data.sql ve queries.sql çalıştırıldı. Paylaşılan son sorgu çıktılarında bir acil durum kişisi, kullanılabilir push kaydı için boş sonuç ve queued durumunda, sent_at/read_at/provider_message_id alanları NULL olan test bildirimi doğrulandı. Diğer sorguların bu yeni test veritabanındaki çıktıları henüz paylaşılmadığından hepsinin ayrıca incelendiği iddia edilmez. Önceki ulgen veritabanında ölçüm, özet, izin ve olay sorguları adım adım denenmiştir.

Hazırlama sırasında ayrı bir MySQL örneğiyle otomatik test başlatma denemesi başlangıçta başarısız olmuştu; sonraki kullanıcı yükleme testi yukarıda kaydedilmiştir. Kullanıcının normal MySQL servisine bu denemede müdahale edilmedi. Gerçek API, kimlik doğrulama ve bildirim entegrasyon testleri henüz yapılmadı.

## Dosyalar

- schema.sql: Yalnızca tablolar, ilişkiler, indeksler ve kurallar. DROP yoktur; veritabanı oluşturmaz veya seçmez.
- sample_data.sql: Boş test şemasına bir kez yüklenecek sahte veriler. Kimlikleri sabit varsaymaz; yeni kayıt numaralarını kullanır. Bildirim göndericilerini kapalı tutun.
- queries.sql: Test verisi için son ölçüm, geçmiş, özet, izin, olay, kişi, token ve bildirim okuma örnekleri. Her sorgunun beklenen sonucu yorum satırında bulunur.
- audit.sql: Seçili veritabanındaki yabancı anahtar, benzersizlik ve CHECK tanımlarını okur.

## Boş test veritabanına kurulum

Terminalde bu klasöre geçin. Komutları birer birer çalıştırın; herhangi bir hata varsa devam etmeyin. Parolalar etkileşimli girilir, dosyaya yazılmaz.

```bash
mysql -u root -p -e "CREATE DATABASE ulgen_import_test CHARACTER SET utf8mb4;"
mysql -u root -p --show-warnings ulgen_import_test < schema.sql
mysql -u root -p --show-warnings ulgen_import_test < sample_data.sql
mysql -u root -p ulgen_import_test < audit.sql
mysql -u root -p ulgen_import_test < queries.sql
```

CREATE DATABASE mevcut isimle hata verirse mevcut veritabanını silmeyin; farklı, yeni bir test adı seçin ve diğer komutlarda aynı adı kullanın. Dosyaları mevcut ulgen veritabanına tekrar yüklemeyin. Otomatik göndericiler bu test sırasında çalışmamalı. SQL dosyaları kendi başlarına push/SMS göndermez.

Şema kurulumundan sonra 9 tablo, 14 FK, 18 benzersiz indeks satırı (9 PRIMARY dahil), 37 etkin CHECK beklenir. Test verisi sayıları: users 2, devices 1, measurements 3, access_permissions 1, thresholds 1, events 1, contacts 1, push_tokens 1, notifications 1.

## Tabloların görevleri

| Tablo | Amaç |
|---|---|
| users | Kullanıcı hesabı, parola özeti ve hesap aktifliği |
| devices | Giyilebilir cihaz ve kullanıcı ilişkisi |
| measurements | Zaman damgalı sensör paketleri ve sensör bazında geçerlilik |
| access_permissions | Veri sahibi–yakın görüntüleme izni |
| thresholds | Kullanıcının güncel eşik ayarları |
| events | Olay türü, geri sayım ve işlem durumu |
| contacts | Acil durumda haber verilecek kişiler |
| push_tokens | Kullanıcıya bağlı uygulama kurulumlarının bildirim adresleri |
| notifications | Olay için alıcıya yönelik bildirim kaydı |

## Ortak sözleşme

- Tüm SQL bağlantıları UTC kullanır: SET time_zone = '+00:00'. DATETIME sütunları saat dilimi saklamaz; API UTC'ye dönüştürerek yazmalı.
- API tarihleri ISO 8601 UTC biçiminde gönderir: 2026-11-07T17:32:57.400Z. Mobil/web yerel gösterime dönüştürür. DATETIME'ı JSON'a çevirirken kendiliğinden Z geldiği varsayılmamalı.
- devices.id ve measurements.device_id sayısal veritabanı kimliğidir. ULGEN-001, devices.device_code değeridir. Önceki örnek JSON'daki device_id alanında cihaz kodu kullanımı henüz son sözleşme değildir: JSON alanını device_code yapmak veya sayısal kimlik kullanmak ekipçe kesinleştirilmeli. Kod, API'de sayısal id'ye eşlenir.
- sample_id, cihaz başına ölçüm kimliğidir; yeniden gönderimde değişmez. (device_id, sample_id) benzersizdir. Bir tekrarın mevcut kayıtla aynı içeriği taşıyıp taşımadığını API kontrol eder.
- measured_at, ölçüm anıdır; received_at kayıt/sunucuya ulaşma anıdır. Eski paketin geç gelmesi güncel değeri değiştirmemeli. En son ölçüm, measured_at DESC, id DESC ile seçilir.
- Sayısal sensör alanları NULL olabilir. NULL, 0 değildir. Geçerli bayrağı TRUE ise değer de bulunmalı. Sinyal kalitesinin bilimsel doğruluğu bu CHECK ile doğrulanmaz.
- stress_index/stress_threshold ölçeği ve algoritması belirlenmedi; örneklerde NULL ve stress_valid=0.
- is_active, çevrimiçi/Bluetooth bağlantısı demek değildir. last_seen_at için eski paketlerin yeniden yüklenmesi ve bağlantı bilgisi ayrı değerlendirilmelidir.
- access_permissions durumları: pending, accepted, rejected, revoked. Görüntüleme için accepted ve revoked_at IS NULL gerekir; oturum ve hesap aktifliği ayrıca kontrol edilir.
- İzin kabulü: sahibin oluşturduğu daveti yakın kabul eder. İzin kaldırılınca her veri isteğinde güncel izin kontrol edilir. contacts kaydı görüntüleme izni vermez.
- events durumları: pending, cancelled, escalated, resolved. escalated bildirim ulaştı anlamına gelmez. Türler: fall, high_heart_rate, low_heart_rate, low_spo2, high_stress.
- countdown_seconds toplam süredir; her saniye azaltılarak yazılmaz. deadline_at sunucunun karar zamanıdır. Geç gelen olay ve iptal sınırı politikası API'de kesinleştirilmeli.
- contacts.priority için 1 en yüksek öncelik önerisidir. Sıralı mı toplu mu bildirim gönderileceği henüz belirlenmedi. Telefonlar API'de ortak biçime getirilir.
- push_tokens.installation_id, bileklik kimliği değildir; mobil uygulama kurulumu için mobil ekibin yöneteceği kimliktir. token_hash, gerçek tokenın UTF-8 baytlarından hesaplanan SHA-256'nın 64 küçük harfli hex gösterimidir; backend üretir. SHA-256 burada parola saklama yöntemi değildir.
- Bildirim hizmeti seçilmedi. provider='test' gerçek sağlayıcı değildir. Tokenın değişmesi, hesap değişimi, çıkış ve sağlayıcı hataları API'de yönetilmelidir.
- notifications.type önerileri countdown/emergency; channel push/sms; status queued/sending/sent/delivered/failed/cancelled. Ekip onayı olmadan isimleri tek taraflı değiştirmeyin.
- sent_at sağlayıcı kabulüdür, teslim veya okunma kanıtı değildir. delivered yalnızca doğrulama varsa kullanılır. read_at, yetkili uygulamanın okundu isteğiyle güncellenir.

## Test kayıtlarının anlamı

İki hesabın password_hash alanındaki ! gerçek parola özeti değildir. Hesaplar ve giyilebilir cihaz pasiftir; sahte push kaydı da pasiftir. Test kullanıcısı 3 ölçüm içerir: 75/98, 78/97 ve geçersiz/temassız paket. Geçerli nabız özeti 2, 76.50, 75.00, 78.00 olur. En son paket geçersizdir; son geçerli nabız ayrıca istenirse 78.00'dır.

İzin ilişkisi test sonunda revoked durumundadır. Acil durum kişisi kaydı bundan bağımsız aktiftir. Düşme olayı escalated, bildirim queued; gerçek gönderim yoktur. Test tarihleri 7 Kasım 2026'ya sabittir, bugünün canlı verisi değildir.

Eşik örneği 60/100 BPM, SpO2 95, darbe 2.5 g içerir ve is_enabled=0'dır. Bunlar prototip testi içindir; kişiye özgü doğrulanmış klinik acil durum eşikleri değildir. Dinlenme/hareket, temas, kalite, süre ve tekrar ölçüm kuralları uygulanmadan otomatik sağlık alarmı açılmamalıdır. Darbe eşiği tek başına düşme kararı değildir. Stres eşiği belirlenmedi.

## Backend geliştiricisiyle iş bölümü

Veritabanı sorumlusu: şema, ilişkiler, indeksler, sorgular, test verileri ve değişiklik dosyaları.
Backend sorumlusu: FastAPI, JSON/Pydantic modelleri, kimlik doğrulama, kaynak erişimi, SQLAlchemy/PyMySQL bağlantısı, iş kuralları ve görev/bildirim mekanizması. ORM model türleri (UNSIGNED, uzunluk, hassasiyet, NULL, varsayılan ve kısıtlar) şemayla uyumlu olmalı.

İki kişi ayrı yerel veritabanlarıyla çalışabilir. Şema dosyaları ortak depoda tutulur; değişiklikler önce paylaşılır. Sonraki değişiklik için sürümlü ALTER TABLE dosyası veya ekipçe seçilmiş tek Alembic akışı kullanılır. SQL ve ORM'nin birbirinden bağımsız, farklı şemalar üretmesine izin verilmez. SQLite örnekleri bu MySQL şemasının yerine kullanılmaz.

Root hesabı API'ye verilmez. API için ulgen şemasına gereken okuma/yazma yetkileri olan ayrı yerel hesap oluşturulması sonraki kurulum adımıdır; parola bu pakete konulmaz. Şema değişiklikleri ayrı yönetim yetkisiyle uygulanır.

## Teslimden önce ve entegrasyonda kalan işler

1. Boş MySQL şemasına yükleme testi kullanıcı tarafından yapıldı. Yeni test veritabanındaki tüm sorgu sonuçlarının incelenmesi ve hata olup olmadığının son kontrolü kaldı.
2. Yabancı anahtar, tekrar ölçüm ve CHECK ihlallerinin gerçekten reddedildiği davranış testlerini ayrı test şemasında yapmak.
3. E-posta normalizasyonu/büyük-küçük harf ve kolasyon politikasını kesinleştirmek. UNIQUE alan e-posta biçimini doğrulamaz; boş metinleri API reddetmeli.
4. Rol/izin sözleşmesini kesinleştirmek: tek role alanı eklenmedi; kişi hem izlenen hem yakın olabilir. Gerekirse ek roller ayrı tasarlanır.
5. API'de çapraz tutarlılık: events.user_id ile cihaz sahibi, measurement_id ile olay cihazı, notification alıcısı ile contacts.linked_user_id eşleşmeli. Ayrı FK'ler bunların aynı kişiye aitliğini tek başına garanti etmez.
6. İzin ve olay durum geçişleri, kabul/iptal tarihleri, aktiflik ve zaman pencereleri API'de yönetilmeli. Süresi dolan olayla aynı anda iptal ve birden fazla işçinin yarışması işlem/kilitleme tasarımı gerektirir.
7. notifications tablosunda şu an tekrar bildirimi engelleyen UNIQUE yok. Aynı olay/alıcı/kanal için tekrar oluşturmayı ve tekrar gönderim politikasını backend ile çözmek gerekir. Bu paket exactly-once bildirim garantisi sağlamaz.
8. Raporda çoklu telefon isteniyor; push_tokens bunu saklayabiliyor. Ancak notifications tek provider_message_id tutuyor. Çoklu telefona gönderim ve her denemenin sonucu/sunum kimliği bu şemada ayrıntılı tutulmuyor. Ek tabloyu kullanıcı onaylamadı; bu kararı ekipçe çözmeden bildirim altyapısını tamamlandı saymayın.
9. users için parola özeti alanı var; gerçek hashleme, giriş/yenileme/çıkış ve parola sıfırlama backend'de uygulanmadı. Oturum/token saklama tasarımına göre ek tablolar gerekebilir.
10. Cihaz el değiştirdiğinde eski ölçümlerin yeni kullanıcıya ait görünmesini önleyen sahiplik geçmişi politikası belirlenmedi. Şimdilik cihazın user_id değerini geçmişi düşünmeden değiştirmeyin.
11. Son ölçüm endpointi belgede son geçerli ölçüm diye geçiyor. Biz son paket ile son geçerli değeri ayırdık. JSON'a tarih/geçerlilik eklenerek bu sözleşme ekipçe kesinleştirilmeli; eski geçerli değer yeniymiş gibi gösterilmemeli.
12. Veri saklama/silme, RESTRICT ilişkilerinin yönetimi, yedekleme ve erişim kaydı ihtiyacı kararlaştırılmalı.
13. Mobil/API entegrasyonu, gerçek cihaz, gerçek push sağlayıcısı ve yük altında performans testleri yapılmadı. Eşik/hareket/stres yöntemleri doğrulanmadı.

## Kaynaklar

Ana kapsam: Kullanıcının paylaştığı ÜLGEN Backend Geliştirme ve API Görev Listesi, özellikle 2–14. bölümler.
Mevcut şema doğrulaması: Kullanıcının paylaştığı information_schema kontrol çıktısı.
Eşik araştırması: https://www.heart.org/en/health-topics/high-blood-pressure/the-facts-about-high-blood-pressure/all-about-heart-rate-pulse ; https://www.fda.gov/consumers/consumer-updates/pulse-oximeter-basics ; https://onlinelibrary.wiley.com/doi/10.1155/2022/9930681
