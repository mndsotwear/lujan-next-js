-- استوری‌های صفحه‌ی اصلی و اسلایدهای عکس/ویدیو
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cover" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StorySlide" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ctaLabel" TEXT,
    "ctaLink" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StorySlide_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StorySlide_storyId_idx" ON "StorySlide"("storyId");

ALTER TABLE "StorySlide" ADD CONSTRAINT "StorySlide_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
