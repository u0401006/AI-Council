# Gov.tw 輿情爬蟲系統規劃

## 專案目標

爬取台灣政府各級機關官網的公關稿、新聞稿、聲明，建立議題訊號偵測系統。

---

## 技術選型

| 層級 | 技術 | 理由 |
|-----|------|-----|
| 爬取 | Scrapy | 多站點管理、內建去重、增量爬取 |
| 內容提取 | Trafilatura | 自動提取正文，比手寫 XPath 穩健 |
| 排程 | Celery + Redis | 分散式排程、任務監控 |
| 存儲 | PostgreSQL | 結構化 metadata |
| 全文檢索 | Elasticsearch | 快速查詢、相似度搜尋 |
| 向量化 | BGE-small-zh | 中文語義 embedding |
| 聚類 | HDBSCAN | 無須預設群數，適合新議題偵測 |
| 通知 | LINE Notify / Slack | 即時警報 |
| 部署 | Docker Compose | 一鍵啟動全環境 |

---

## 系統架構

```
┌─────────────────────────────────────────────────────────┐
│                 Scheduler (Celery Beat)                 │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│  Scrapy Spiders                                         │
│  ├── rss_spider.py       (通用 RSS)                     │
│  ├── list_page_spider.py (通用列表頁)                   │
│  ├── ey_spider.py        (行政院)                       │
│  ├── moi_spider.py       (內政部)                       │
│  └── ...                                                │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│  Pipeline                                               │
│  ├── DuplicateFilter     (URL + content hash 去重)      │
│  ├── ContentExtractor    (trafilatura 提取正文)         │
│  ├── Normalizer          (日期、機關名稱標準化)          │
│  ├── PostgresPipeline    (metadata 存儲)                │
│  └── ElasticPipeline     (全文索引)                     │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│  Signal Detection (獨立服務)                            │
│  ├── Embedding Service   (文章向量化)                   │
│  ├── Clustering Service  (議題聚類)                     │
│  ├── Anomaly Detector    (新議題偵測)                   │
│  └── Alert Service       (通知推送)                     │
└─────────────────────────────────────────────────────────┘
```

---

## 目錄結構

```
gov-crawler/
├── docker-compose.yml
├── pyproject.toml
├── README.md
│
├── crawler/
│   ├── scrapy.cfg
│   ├── gov_crawler/
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   ├── items.py
│   │   ├── pipelines/
│   │   │   ├── __init__.py
│   │   │   ├── duplicate.py
│   │   │   ├── extractor.py
│   │   │   ├── normalizer.py
│   │   │   ├── postgres.py
│   │   │   └── elastic.py
│   │   ├── spiders/
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── rss.py
│   │   │   ├── list_page.py
│   │   │   └── configs/
│   │   │       └── agencies.yaml
│   │   └── utils/
│   │       ├── date_parser.py
│   │       └── agency_normalizer.py
│
├── signal_detection/
│   ├── __init__.py
│   ├── embedder.py
│   ├── clusterer.py
│   ├── anomaly.py
│   └── alerter.py
│
├── scheduler/
│   ├── __init__.py
│   ├── celery_app.py
│   └── tasks.py
│
└── tests/
    ├── test_spiders.py
    ├── test_pipelines.py
    └── test_signal.py
```

---

## 資料模型

### PostgreSQL Schema

```sql
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT UNIQUE NOT NULL,
    url_hash TEXT NOT NULL,
    content_hash TEXT,
    
    agency_code TEXT NOT NULL,        -- e.g., "MOI", "MOFA"
    agency_name TEXT NOT NULL,        -- e.g., "內政部"
    
    title TEXT NOT NULL,
    content TEXT,
    published_at TIMESTAMP,
    
    crawled_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    embedding_id TEXT,                -- 關聯向量資料庫
    cluster_id INTEGER,
    
    CONSTRAINT idx_url_hash UNIQUE (url_hash)
);

CREATE INDEX idx_agency ON articles(agency_code);
CREATE INDEX idx_published ON articles(published_at DESC);
CREATE INDEX idx_cluster ON articles(cluster_id);
```

### Scrapy Item

```python
import scrapy

class ArticleItem(scrapy.Item):
    url = scrapy.Field()
    agency_code = scrapy.Field()
    agency_name = scrapy.Field()
    title = scrapy.Field()
    raw_html = scrapy.Field()
    content = scrapy.Field()          # trafilatura 提取後
    published_at = scrapy.Field()
    crawled_at = scrapy.Field()
```

---

## Spider 設計

### 機關配置 (agencies.yaml)

```yaml
agencies:
  - code: EY
    name: 行政院
    type: rss
    url: https://www.ey.gov.tw/Page/RSS/...
    
  - code: MOI
    name: 內政部
    type: list_page
    url: https://www.moi.gov.tw/News.aspx
    selectors:
      list: ".news-list .item"
      link: "a::attr(href)"
      next_page: ".pagination .next::attr(href)"
      title: "h1.title::text"
      date: ".date::text"
      content: ".content"
      
  - code: MOFA
    name: 外交部
    type: list_page
    url: https://www.mofa.gov.tw/News.aspx
    selectors:
      # ...

  - code: CDC
    name: 疾病管制署
    type: rss
    url: https://www.cdc.gov.tw/rss/...
```

### Base Spider

```python
# gov_crawler/spiders/base.py
import scrapy
from datetime import datetime
from gov_crawler.items import ArticleItem

class BaseGovSpider(scrapy.Spider):
    """所有政府網站 Spider 的基底類別"""
    
    def make_item(self, response, title, content, published_at):
        return ArticleItem(
            url=response.url,
            agency_code=self.agency_code,
            agency_name=self.agency_name,
            title=title.strip() if title else None,
            raw_html=response.text,
            content=content,
            published_at=published_at,
            crawled_at=datetime.utcnow().isoformat(),
        )
```

### RSS Spider

```python
# gov_crawler/spiders/rss.py
import feedparser
from .base import BaseGovSpider

class RSSSpider(BaseGovSpider):
    name = "rss_spider"
    
    def __init__(self, agency_config, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.agency_code = agency_config["code"]
        self.agency_name = agency_config["name"]
        self.start_urls = [agency_config["url"]]
    
    def parse(self, response):
        feed = feedparser.parse(response.text)
        for entry in feed.entries:
            yield response.follow(
                entry.link,
                callback=self.parse_article,
                meta={"entry": entry}
            )
    
    def parse_article(self, response):
        entry = response.meta["entry"]
        yield self.make_item(
            response=response,
            title=entry.get("title"),
            content=None,  # Pipeline 會用 trafilatura 提取
            published_at=entry.get("published"),
        )
```

### List Page Spider

```python
# gov_crawler/spiders/list_page.py
from .base import BaseGovSpider

class ListPageSpider(BaseGovSpider):
    name = "list_page_spider"
    
    def __init__(self, agency_config, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.agency_code = agency_config["code"]
        self.agency_name = agency_config["name"]
        self.start_urls = [agency_config["url"]]
        self.selectors = agency_config["selectors"]
    
    def parse(self, response):
        # 列表頁：提取所有文章連結
        for item in response.css(self.selectors["list"]):
            link = item.css(self.selectors["link"]).get()
            if link:
                yield response.follow(link, callback=self.parse_article)
        
        # 分頁
        next_page = response.css(self.selectors["next_page"]).get()
        if next_page:
            yield response.follow(next_page, self.parse)
    
    def parse_article(self, response):
        yield self.make_item(
            response=response,
            title=response.css(self.selectors["title"]).get(),
            content=None,
            published_at=response.css(self.selectors["date"]).get(),
        )
```

---

## Pipeline 設計

### 去重 Pipeline

```python
# gov_crawler/pipelines/duplicate.py
import hashlib
from scrapy.exceptions import DropItem

class DuplicateFilterPipeline:
    def __init__(self):
        self.seen_urls = set()
    
    def process_item(self, item, spider):
        url_hash = hashlib.sha256(item["url"].encode()).hexdigest()[:16]
        
        if url_hash in self.seen_urls:
            raise DropItem(f"Duplicate: {item['url']}")
        
        self.seen_urls.add(url_hash)
        item["url_hash"] = url_hash
        return item
```

### 內容提取 Pipeline

```python
# gov_crawler/pipelines/extractor.py
import trafilatura

class ContentExtractorPipeline:
    def process_item(self, item, spider):
        if item.get("raw_html") and not item.get("content"):
            extracted = trafilatura.extract(
                item["raw_html"],
                include_comments=False,
                include_tables=True,
            )
            item["content"] = extracted
        
        # content hash 用於偵測內容更新
        if item.get("content"):
            import hashlib
            item["content_hash"] = hashlib.sha256(
                item["content"].encode()
            ).hexdigest()[:16]
        
        return item
```

### PostgreSQL Pipeline

```python
# gov_crawler/pipelines/postgres.py
import psycopg2
from psycopg2.extras import execute_values

class PostgresPipeline:
    def open_spider(self, spider):
        self.conn = psycopg2.connect(spider.settings.get("DATABASE_URL"))
        self.cursor = self.conn.cursor()
    
    def close_spider(self, spider):
        self.conn.commit()
        self.conn.close()
    
    def process_item(self, item, spider):
        self.cursor.execute("""
            INSERT INTO articles (url, url_hash, content_hash, agency_code, 
                                  agency_name, title, content, published_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (url_hash) DO UPDATE SET
                content = EXCLUDED.content,
                content_hash = EXCLUDED.content_hash,
                updated_at = NOW()
        """, (
            item["url"], item["url_hash"], item.get("content_hash"),
            item["agency_code"], item["agency_name"], 
            item["title"], item.get("content"), item.get("published_at")
        ))
        return item
```

---

## 排程設計

```python
# scheduler/tasks.py
from celery import Celery
from scrapy.crawler import CrawlerProcess
from gov_crawler.spiders.rss import RSSSpider
from gov_crawler.spiders.list_page import ListPageSpider

app = Celery("gov_crawler")

@app.task
def crawl_agency(agency_config):
    process = CrawlerProcess()
    
    if agency_config["type"] == "rss":
        process.crawl(RSSSpider, agency_config=agency_config)
    else:
        process.crawl(ListPageSpider, agency_config=agency_config)
    
    process.start()

# Celery Beat 排程
app.conf.beat_schedule = {
    "crawl-all-agencies": {
        "task": "scheduler.tasks.crawl_all",
        "schedule": 14400.0,  # 每 4 小時
    },
}
```

---

## 議題訊號偵測

```python
# signal_detection/embedder.py
from sentence_transformers import SentenceTransformer
import numpy as np

class ArticleEmbedder:
    def __init__(self, model_name="BAAI/bge-small-zh-v1.5"):
        self.model = SentenceTransformer(model_name)
    
    def embed(self, texts: list[str]) -> np.ndarray:
        return self.model.encode(texts, normalize_embeddings=True)


# signal_detection/anomaly.py
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

class AnomalyDetector:
    def __init__(self, threshold=0.3):
        self.threshold = threshold
        self.historical_centroids = None  # 歷史議題中心點
    
    def detect_new_topics(self, new_embeddings: np.ndarray) -> list[int]:
        """回傳可能是新議題的文章索引"""
        if self.historical_centroids is None:
            return list(range(len(new_embeddings)))
        
        # 計算與所有歷史議題的最大相似度
        similarities = cosine_similarity(new_embeddings, self.historical_centroids)
        max_sim = similarities.max(axis=1)
        
        # 低於閾值 = 可能是新議題
        anomaly_indices = np.where(max_sim < self.threshold)[0]
        return anomaly_indices.tolist()
```

---

## 部署

### docker-compose.yml

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: gov_crawler
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    
  redis:
    image: redis:7-alpine
    
  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    volumes:
      - es_data:/usr/share/elasticsearch/data
    
  crawler:
    build: .
    depends_on:
      - postgres
      - redis
      - elasticsearch
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres/gov_crawler
      REDIS_URL: redis://redis:6379
      ELASTICSEARCH_URL: http://elasticsearch:9200
    command: celery -A scheduler.celery_app worker --beat --loglevel=info

volumes:
  postgres_data:
  es_data:
```

---

## 開發順序

1. **Phase 1: 基礎爬取**
   - [ ] 建立專案骨架
   - [ ] 實作 RSS Spider（選 3-5 個有 RSS 的機關）
   - [ ] 實作基礎 Pipeline（去重、存儲）
   - [ ] 本地測試

2. **Phase 2: 擴展覆蓋**
   - [ ] 實作 List Page Spider
   - [ ] 新增 10+ 機關配置
   - [ ] 加入 Trafilatura 內容提取
   - [ ] 加入 Elasticsearch

3. **Phase 3: 訊號偵測**
   - [ ] 實作 Embedding 服務
   - [ ] 實作聚類與異常偵測
   - [ ] 建立通知機制

4. **Phase 4: 生產化**
   - [ ] Docker 化
   - [ ] 監控與告警（Spider 成功率）
   - [ ] 定期維護改版的 selector

---

## 注意事項

- **robots.txt**: 政府網站多數允許爬取，但需逐站確認
- **爬取頻率**: 建議 4-6 小時一次，避免造成負擔
- **User-Agent**: 誠實標註用途，如 `GovSignalBot/1.0 (+https://your-project.com)`
- **網站改版**: 政府網站常改版，需監控 spider 成功率，設定 <50% 時告警
