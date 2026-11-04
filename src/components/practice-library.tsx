"use client";

import { useMemo, useState } from "react";
import {
  practiceResources,
  resourceCollections,
  resourceSheetUrl,
} from "@/data/practice-resources";
import { AppShell } from "./app-shell";
import { Icon } from "./icon";

function skillLabel(skills: string[]) {
  return skills.map((skill) => skill.toUpperCase()).join(" & ");
}

function skillIcon(skills: string[]): "book" | "headphones" | "edit" {
  if (skills.includes("writing")) return "edit";
  if (skills.includes("speaking")) return "headphones";
  return "book";
}

export function PracticeLibrary() {
  const [collection, setCollection] = useState("Tất cả");
  const resources = useMemo(
    () =>
      collection === "Tất cả"
        ? practiceResources
        : practiceResources.filter((item) => item.collection === collection),
    [collection],
  );

  return (
    <AppShell active="practice">
      <div className="breadcrumb">
        <span>Không gian học tập</span>
        <Icon name="chevron" size={12} />
        <span>Kho tài liệu</span>
      </div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            <span />
            READING. LISTENING. LUYỆN TẬP.
          </span>
          <h1>
            Luyện theo bộ đề, <span>tiến bộ mỗi ngày.</span>
          </h1>
          <p>
            Chọn tài liệu phù hợp và mở nguồn để luyện đủ bốn kỹ năng IELTS.
          </p>
        </div>
        <span className="heading-detail">
          <Icon name="book" size={17} /> IELTS Academic
        </span>
      </div>
      <section className="practice-hero">
        <div>
          <span className="practice-kicker">THƯ VIỆN TÀI LIỆU</span>
          <h2>
            Chọn đúng bộ đề.
            <br />
            Giữ nhịp luyện đều.
          </h2>
          <p>
            Danh mục được cập nhật từ kế hoạch học tập của bạn.
            <br />
            Mỗi thẻ sẽ mở trang tài liệu nguồn trong tab mới.
          </p>
        </div>
        <div className="practice-band-card">
          <Icon name="book" size={27} />
          <small>TÀI LIỆU CÓ SẴN</small>
          <strong>{practiceResources.length}</strong>
          <span>4 kỹ năng IELTS</span>
        </div>
      </section>
      <section
        className="practice-catalog"
        aria-label="Danh mục tài liệu luyện IELTS"
      >
        <div className="catalog-heading">
          <div>
            <h2>Danh mục tài liệu</h2>
            <p>Lọc theo bộ đề rồi mở bài luyện trực tiếp từ nguồn.</p>
          </div>
          <a
            className="text-link"
            href={resourceSheetUrl}
            target="_blank"
            rel="noreferrer"
          >
            Xem danh mục gốc <Icon name="arrow" size={16} />
          </a>
        </div>
        <div className="catalog-filters">
          <div className="skill-tabs" aria-label="Bộ tài liệu">
            {resourceCollections.map((item) => (
              <button
                key={item}
                aria-pressed={collection === item}
                onClick={() => setCollection(item)}
              >
                <Icon name="book" size={17} />
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="catalog-count" role="status">
          <strong>{resources.length} tài liệu</strong>
          <span>
            Liên kết ngoài · Không lưu nội dung, đáp án hoặc audio của nguồn vào
            AAA
          </span>
        </div>
        <div className="exercise-grid">
          {resources.map((resource, index) => (
            <article
              className="exercise-card resource-card"
              key={resource.title}
            >
              <div className="exercise-cover reading">
                <span className="exercise-skill">
                  <Icon name={skillIcon(resource.skills)} size={15} />
                  {skillLabel(resource.skills)}
                </span>
                <span className="exercise-cover-symbol" aria-hidden="true">
                  <Icon name={skillIcon(resource.skills)} size={56} />
                </span>
                <span className="exercise-cover-number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="exercise-band">{resource.collection}</span>
              </div>
              <div className="exercise-card-body">
                <h3>{resource.title}</h3>
                <p>{resource.description}</p>
                <a
                  className="exercise-source"
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Nguồn tài liệu: DOL English
                </a>
                <div className="exercise-card-footer">
                  <span>Mở trong tab mới</span>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Mở ${resource.title} từ nguồn`}
                  >
                    Mở tài liệu <Icon name="arrow" size={17} />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
      <div className="practice-tip">
        <Icon name="shield" size={20} />
        <p>
          <strong>Tôn trọng nguồn học liệu.</strong> AAA chỉ tổ chức các đường
          dẫn theo danh mục bạn cung cấp. Nội dung, đáp án và điều khoản sử dụng
          thuộc về trang nguồn; hãy xem điều khoản tại đó trước khi sử dụng.
        </p>
      </div>
    </AppShell>
  );
}
