from __future__ import annotations

import json
import math
import re
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
POSTS_DIR = ROOT / "posts"
FRAGMENTS_DIR = POSTS_DIR / "fragments"
DATA_DIR = ROOT / "data"
ARTICLES_DIR = DATA_DIR / "articles"


FRONT_MATTER_PATTERN = re.compile(r"^---\s*\n(.*?)\n---\s*\n?(.*)$", re.DOTALL)
FRAGMENT_HEADING_PATTERN = re.compile(r"^##+\s+(.+?)\s*$")
FRAGMENT_DATE_PATTERN = re.compile(
    r"^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$"
)
MARKDOWN_IMAGE_PATTERN = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")


def parse_scalar(raw: str):
    value = raw.strip()
    if not value:
        return ""

    if value.startswith(("'", '"')) and value.endswith(value[0]) and len(value) >= 2:
        return value[1:-1]

    if value.startswith("[") and value.endswith("]"):
        items = [item.strip() for item in value[1:-1].split(",") if item.strip()]
        return [parse_scalar(item) for item in items]

    lowered = value.lower()
    if lowered == "true":
        return True
    if lowered == "false":
        return False

    if re.fullmatch(r"-?\d+", value):
        return int(value)

    if re.fullmatch(r"-?\d+\.\d+", value):
        return float(value)

    return value


def parse_front_matter(text: str):
    match = FRONT_MATTER_PATTERN.match(text)
    if not match:
        return {}, text.strip()

    front_matter, body = match.groups()
    metadata = {}
    current_key = None

    for raw_line in front_matter.splitlines():
      line = raw_line.rstrip()
      stripped = line.strip()

      if not stripped or stripped.startswith("#"):
          continue

      if stripped.startswith("- ") and current_key:
          metadata.setdefault(current_key, [])
          metadata[current_key].append(parse_scalar(stripped[2:]))
          continue

      if ":" not in line:
          continue

      key, raw_value = line.split(":", 1)
      key = key.strip()
      raw_value = raw_value.strip()

      if not raw_value:
          metadata[key] = []
          current_key = key
          continue

      metadata[key] = parse_scalar(raw_value)
      current_key = None

    return metadata, body.strip()


def normalize_tags(raw_tags):
    if isinstance(raw_tags, list):
        return [str(tag).strip() for tag in raw_tags if str(tag).strip()]

    if isinstance(raw_tags, str):
        return [tag.strip() for tag in raw_tags.split(",") if tag.strip()]

    return []


def strip_markdown(text: str) -> str:
    value = text
    value = re.sub(r"```.*?```", " ", value, flags=re.DOTALL)
    value = re.sub(r"`([^`]+)`", r"\1", value)
    value = re.sub(r"!\[([^\]]*)\]\([^)]+\)", r"\1", value)
    value = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", value)
    value = re.sub(r"^#{1,6}\s+", "", value, flags=re.MULTILINE)
    value = re.sub(r"^\s*>\s?", "", value, flags=re.MULTILINE)
    value = re.sub(r"^\s*[-*+]\s+", "", value, flags=re.MULTILINE)
    value = re.sub(r"^\s*\d+\.\s+", "", value, flags=re.MULTILINE)
    value = value.replace("**", "").replace("__", "").replace("*", "").replace("_", "")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def excerpt_from_body(markdown: str, limit: int = 96) -> str:
    blocks = [block.strip() for block in re.split(r"\n\s*\n", markdown) if block.strip()]

    for block in blocks:
        if block.startswith("```"):
            continue

        cleaned = strip_markdown(block)
        if cleaned:
            if len(cleaned) <= limit:
                return cleaned
            return cleaned[: limit - 1].rstrip() + "…"

    return ""


def count_visible_characters(text: str) -> int:
    return len(re.sub(r"\s+", "", text))


def bool_value(value, default: bool) -> bool:
    if isinstance(value, bool):
        return value
    if value in ("true", "True", "1", 1):
        return True
    if value in ("false", "False", "0", 0):
        return False
    return default


def build_post_record(category_dir: Path, markdown_file: Path):
    raw_text = markdown_file.read_text(encoding="utf-8")
    metadata, body = parse_front_matter(raw_text)

    folder = category_dir.name
    slug = markdown_file.stem
    title = str(metadata.get("title") or slug)
    category_name = str(metadata.get("category") or folder)
    category_order = int(metadata.get("categoryOrder", 999))
    date_value = str(metadata.get("date") or "")
    tags = normalize_tags(metadata.get("tags"))
    plain_text = strip_markdown(body)
    excerpt = str(metadata.get("excerpt") or excerpt_from_body(body))
    summary = str(metadata.get("summary") or excerpt)
    description = str(metadata.get("description") or excerpt or summary or title)
    visible_characters = count_visible_characters(plain_text)
    word_count = str(metadata.get("wordCount") or f"{visible_characters} 字")
    reading_minutes = max(1, math.ceil(visible_characters / 300)) if visible_characters else 1
    reading_time = str(metadata.get("readingTime") or f"{reading_minutes} 分钟")
    cover = str(metadata.get("cover") or "")

    record = {
        "id": slug,
        "title": title,
        "excerpt": excerpt,
        "summary": summary,
        "description": description,
        "category": category_name,
        "categoryOrder": category_order,
        "folder": folder,
        "date": date_value,
        "dateLabel": str(metadata.get("dateLabel") or date_value),
        "tags": tags,
        "readingTime": reading_time,
        "readingMinutes": reading_minutes,
        "wordCount": word_count,
        "wordCountValue": visible_characters,
        "featured": bool_value(metadata.get("featured"), False),
        "pinned": bool_value(metadata.get("pinned"), False),
        "cover": cover,
        "path": f"article.html?category={folder}&slug={slug}",
        "sourcePath": f"posts/{folder}/{markdown_file.name}",
        "sourceDir": f"posts/{folder}",
        "imageDir": f"image/{folder}/{slug}",
        "showInRecent": bool_value(metadata.get("showInRecent"), True),
        "recentOrder": int(metadata.get("recentOrder", 999)),
        "showInArchive": bool_value(metadata.get("showInArchive"), True),
        "archiveOrder": int(metadata.get("archiveOrder", 999)),
        "content": body,
    }

    return record


def normalize_fragment_datetime(raw_value: str) -> dict[str, str]:
    value = str(raw_value or "").strip()
    match = FRAGMENT_DATE_PATTERN.match(value)

    if not match:
        matched_year = re.search(r"\d{4}", value)
        return {
            "date": value,
            "timeLabel": value,
            "year": matched_year.group(0) if matched_year else "",
        }

    year, month, day, hour, minute, second = match.groups()
    hour = hour or "00"
    minute = minute or "00"
    second = second or "00"
    time_label = f"{year}-{month}-{day} {hour}:{minute}:{second}"

    return {
        "date": f"{year}-{month}-{day}T{hour}:{minute}:{second}+08:00",
        "timeLabel": time_label,
        "year": year,
    }


def fragment_id_from_label(label: str, index: int) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9]+", "-", label).strip("-").lower()
    return normalized or f"fragment-{index + 1}"


def split_fragment_sections(body: str):
    sections = []
    current_label = None
    current_lines = []

    def flush_current():
        if current_label is None:
            return

        sections.append((current_label, "\n".join(current_lines).strip()))

    for line in body.splitlines():
        match = FRAGMENT_HEADING_PATTERN.match(line.strip())
        if match and FRAGMENT_DATE_PATTERN.match(match.group(1).strip()):
            flush_current()
            current_label = match.group(1).strip()
            current_lines = []
            continue

        if current_label is not None:
            current_lines.append(line)

    flush_current()
    return sections


def parse_fragment_content(markdown: str):
    paragraphs = []
    images = []

    for block in re.split(r"\n\s*\n", markdown):
        block = block.strip()
        if not block:
            continue

        for match in MARKDOWN_IMAGE_PATTERN.finditer(block):
            alt = match.group(1).strip()
            raw_src = match.group(2).strip()
            src = raw_src.split(None, 1)[0].strip("<>")
            image = {"src": src, "alt": alt or "碎片图片"}
            if alt:
                image["caption"] = alt
            images.append(image)

        text_block = MARKDOWN_IMAGE_PATTERN.sub("", block).strip()
        if not text_block:
            continue

        paragraph = strip_markdown(text_block)
        if paragraph:
            paragraphs.append(paragraph)

    return paragraphs, images


def build_fragment_record(markdown_file: Path, label: str, content: str, index: int):
    datetime_info = normalize_fragment_datetime(label)
    paragraphs, images = parse_fragment_content(content)

    return {
        "id": fragment_id_from_label(label, index),
        "date": datetime_info["date"],
        "timeLabel": datetime_info["timeLabel"],
        "year": datetime_info["year"],
        "sourcePath": f"posts/fragments/{markdown_file.name}",
        "paragraphs": paragraphs,
        "images": images,
    }


def collect_fragments():
    fragments = []

    if not FRAGMENTS_DIR.exists():
        return fragments

    for markdown_file in sorted(FRAGMENTS_DIR.glob("*.md")):
        raw_text = markdown_file.read_text(encoding="utf-8")
        metadata, body = parse_front_matter(raw_text)
        sections = split_fragment_sections(body)

        if not sections and body.strip():
            label = str(metadata.get("date") or metadata.get("timeLabel") or markdown_file.stem)
            sections = [(label, body.strip())]

        for label, content in sections:
            fragments.append(
                build_fragment_record(markdown_file, label, content, len(fragments))
            )

    return fragments


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def write_js(path: Path, global_name: str, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    content = f"window.{global_name} = {json.dumps(payload, ensure_ascii=False, indent=2)};\n"
    path.write_text(content, encoding="utf-8")


def collect_posts():
    posts = []

    for category_dir in sorted(POSTS_DIR.iterdir()):
        if not category_dir.is_dir():
            continue

        if category_dir == FRAGMENTS_DIR:
            continue

        for markdown_file in sorted(category_dir.glob("*.md")):
            posts.append(build_post_record(category_dir, markdown_file))

    return posts


def build_categories(posts):
    categories = {}

    for post in posts:
        folder = post["folder"]
        current = categories.get(folder)

        if current is None:
            categories[folder] = {
                "id": folder,
                "name": post["category"],
                "folder": folder,
                "description": f"{post['category']}分类",
                "order": post.get("categoryOrder", 999),
                "count": 1,
            }
            continue

        current["count"] += 1
        current["order"] = min(current["order"], post.get("categoryOrder", 999))

    return sorted(
        categories.values(),
        key=lambda item: (item.get("order", 999), item.get("name", "")),
    )


def main():
    posts = collect_posts()
    fragments = collect_fragments()
    categories = build_categories(posts)

    posts_index = [{key: value for key, value in post.items() if key != "content"} for post in posts]

    if ARTICLES_DIR.exists():
        shutil.rmtree(ARTICLES_DIR)
    ARTICLES_DIR.mkdir(parents=True, exist_ok=True)

    write_json(DATA_DIR / "posts.json", posts_index)
    write_js(DATA_DIR / "posts.js", "__BLOG_POSTS__", posts_index)
    write_json(DATA_DIR / "categories.json", categories)
    write_js(DATA_DIR / "categories.js", "__BLOG_CATEGORIES__", categories)
    write_json(DATA_DIR / "fragments.json", fragments)
    write_js(DATA_DIR / "fragments.js", "__BLOG_FRAGMENTS__", fragments)

    for post in posts:
        folder = post["folder"]
        slug = post["id"]
        article_json_path = ARTICLES_DIR / folder / f"{slug}.json"
        article_js_path = ARTICLES_DIR / folder / f"{slug}.js"
        write_json(article_json_path, post)
        write_js(article_js_path, "__BLOG_ARTICLE__", post)

    print(
        f"Built {len(posts)} posts across {len(categories)} categories "
        f"and {len(fragments)} fragments."
    )


if __name__ == "__main__":
    main()
