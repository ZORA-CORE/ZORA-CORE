# Climate Academy Backend v1.0

This document describes the Climate Academy backend module for ZORA CORE, which provides a learning layer for climate and green transition education.

## Overview

The Climate Academy is a structured learning system that:

1. Organizes learning content into lessons, modules, and learning paths
2. Supports external content (YouTube videos, web articles, PDFs)
3. Tracks user progress through the learning material
4. Integrates with other ZORA CORE modules (Climate OS, GOES GREEN, etc.)

## Schema

The Climate Academy uses the following database tables:

### academy_topics

Reusable taxonomy of climate topics for categorizing content.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | NULL for global topics, tenant ID for tenant-specific |
| code | TEXT | Unique topic code (e.g., "energy", "transport", "materials") |
| name | TEXT | Human-readable topic name |
| description | TEXT | Optional description |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### academy_lessons

Individual learning units (videos, articles, interactive content).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | NULL for global lessons, tenant ID for tenant-specific |
| title | TEXT | Lesson title |
| subtitle | TEXT | Optional subtitle |
| description | TEXT | Lesson description |
| content_type | TEXT | Type: video, article, interactive, quiz, mixed |
| source_type | TEXT | Source: youtube, web_article, pdf, zora_internal, other |
| source_url | TEXT | URL to external content |
| duration_minutes_estimated | INTEGER | Estimated duration in minutes |
| language_code | TEXT | Language code (e.g., "en", "da") |
| difficulty_level | TEXT | Level: beginner, intermediate, advanced |
| primary_topic_code | TEXT | Primary topic code |
| tags | TEXT[] | Array of tags for filtering |
| is_active | BOOLEAN | Whether the lesson is active |
| thumbnail_url | TEXT | URL to thumbnail image |
| metadata | JSONB | Additional metadata |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### academy_modules

Groups of related lessons organized into a module.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | NULL for global modules, tenant ID for tenant-specific |
| code | TEXT | Unique module code |
| title | TEXT | Module title |
| description | TEXT | Module description |
| primary_topic_code | TEXT | Primary topic code |
| target_audience | TEXT | Target: households, brands, cities, students, etc. |
| estimated_duration_minutes | INTEGER | Total estimated duration |
| is_active | BOOLEAN | Whether the module is active |
| metadata | JSONB | Additional metadata |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### academy_module_lessons

Join table linking lessons to modules with ordering.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| module_id | UUID | Reference to academy_modules |
| lesson_id | UUID | Reference to academy_lessons |
| lesson_order | INTEGER | Order of lesson within module |
| is_required | BOOLEAN | Whether the lesson is required |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### academy_learning_paths

Longer tracks made of multiple modules.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | NULL for global paths, tenant ID for tenant-specific |
| code | TEXT | Unique path code |
| title | TEXT | Path title |
| description | TEXT | Path description |
| target_audience | TEXT | Target audience |
| recommended_for_profile_type | TEXT | Profile type: household, organization, any |
| primary_topic_code | TEXT | Primary topic code |
| is_active | BOOLEAN | Whether the path is active |
| metadata | JSONB | Additional metadata |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### academy_learning_path_modules

Join table linking modules to learning paths with ordering.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| learning_path_id | UUID | Reference to academy_learning_paths |
| module_id | UUID | Reference to academy_modules |
| module_order | INTEGER | Order of module within path |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### academy_user_progress

Tracks user progress through academy content.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Tenant ID |
| user_id | UUID | Reference to users |
| lesson_id | UUID | Reference to academy_lessons (optional) |
| module_id | UUID | Reference to academy_modules (optional) |
| learning_path_id | UUID | Reference to academy_learning_paths (optional) |
| status | TEXT | Status: not_started, in_progress, completed |
| progress_percent | NUMERIC | Progress percentage (0-100) |
| last_accessed_at | TIMESTAMPTZ | Last access timestamp |
| completed_at | TIMESTAMPTZ | Completion timestamp |
| metadata | JSONB | Additional metadata |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### academy_quizzes (Optional)

Quizzes/assessments linked to lessons.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | NULL for global quizzes, tenant ID for tenant-specific |
| lesson_id | UUID | Reference to academy_lessons (optional) |
| title | TEXT | Quiz title |
| description | TEXT | Quiz description |
| passing_score | INTEGER | Minimum score to pass (e.g., 70) |
| metadata | JSONB | Additional metadata |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### academy_quiz_attempts

Tracks user quiz attempts and scores.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Tenant ID |
| user_id | UUID | Reference to users |
| quiz_id | UUID | Reference to academy_quizzes |
| score | INTEGER | User's score |
| status | TEXT | Status: started, submitted, passed, failed |
| answers | JSONB | JSON structure storing user answers |
| started_at | TIMESTAMPTZ | Start timestamp |
| submitted_at | TIMESTAMPTZ | Submission timestamp |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

## API Endpoints

All endpoints require JWT authentication and are tenant-aware.

### Lessons

#### GET /api/academy/lessons

List lessons for the current tenant (includes global lessons).

Query parameters:
- `topic` - Filter by primary_topic_code
- `content_type` - Filter by content type
- `language` - Filter by language_code
- `difficulty_level` - Filter by difficulty level
- `is_active` - Filter by active status (true/false)

Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "tenant_id": null,
      "title": "What is 100% green energy?",
      "subtitle": "A simple guide for households",
      "content_type": "video",
      "source_type": "youtube",
      "source_url": "https://www.youtube.com/...",
      "duration_minutes_estimated": 12,
      "language_code": "en",
      "difficulty_level": "beginner",
      "primary_topic_code": "energy",
      "tags": ["goes_green", "household", "intro"],
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### GET /api/academy/lessons/:id

Get a specific lesson by ID.

#### POST /api/academy/lessons

Create a new lesson (requires founder/brand_admin role).

Request body:
```json
{
  "title": "What is 100% green energy?",
  "subtitle": "A simple guide for households",
  "description": "Explains green tariffs, guarantees of origin, and what '100% green' really means.",
  "content_type": "video",
  "source_type": "youtube",
  "source_url": "https://www.youtube.com/...",
  "duration_minutes_estimated": 12,
  "language_code": "en",
  "difficulty_level": "beginner",
  "primary_topic_code": "energy",
  "tags": ["goes_green", "household", "intro"]
}
```

#### PATCH /api/academy/lessons/:id

Update a lesson (requires founder/brand_admin role).

### Modules

#### GET /api/academy/modules

List modules for the current tenant (includes global modules).

Query parameters:
- `topic` - Filter by primary_topic_code
- `target_audience` - Filter by target audience
- `is_active` - Filter by active status

#### GET /api/academy/modules/:id

Get a specific module with its lessons.

Response:
```json
{
  "data": {
    "id": "uuid",
    "code": "GOES_GREEN_HOUSEHOLD_STARTER",
    "title": "GOES GREEN for Households - Starter Module",
    "description": "Basics of energy, green tariffs, and simple actions.",
    "primary_topic_code": "energy",
    "target_audience": "households",
    "estimated_duration_minutes": 60,
    "is_active": true,
    "lessons": [
      {
        "id": "uuid",
        "title": "What is 100% green energy?",
        "lesson_order": 1,
        "is_required": true
      }
    ]
  }
}
```

#### POST /api/academy/modules

Create a new module with optional lessons.

Request body:
```json
{
  "code": "GOES_GREEN_HOUSEHOLD_STARTER",
  "title": "GOES GREEN for Households - Starter Module",
  "description": "Basics of energy, green tariffs, and simple actions.",
  "primary_topic_code": "energy",
  "target_audience": "households",
  "estimated_duration_minutes": 60,
  "lessons": [
    { "lesson_id": "uuid-1", "lesson_order": 1 },
    { "lesson_id": "uuid-2", "lesson_order": 2 }
  ]
}
```

#### PATCH /api/academy/modules/:id

Update a module (requires founder/brand_admin role).

### Learning Paths

#### GET /api/academy/paths

List learning paths for the current tenant (includes global paths).

Query parameters:
- `target_audience` - Filter by target audience
- `primary_topic_code` - Filter by topic
- `is_active` - Filter by active status

#### GET /api/academy/paths/:id

Get a specific learning path with its modules.

#### POST /api/academy/paths

Create a new learning path with optional modules.

Request body:
```json
{
  "code": "CLIMATE_FOR_BRANDS_V1",
  "title": "Climate 101 for Brands",
  "description": "From climate basics to product footprint and communication.",
  "target_audience": "brands",
  "primary_topic_code": "materials",
  "modules": [
    { "module_id": "uuid-module-1", "module_order": 1 },
    { "module_id": "uuid-module-2", "module_order": 2 }
  ]
}
```

#### PATCH /api/academy/paths/:id

Update a learning path (requires founder/brand_admin role).

### User Progress

#### GET /api/academy/progress

Get progress for the current user.

Query parameters:
- `learning_path_id` - Filter by learning path
- `module_id` - Filter by module
- `lesson_id` - Filter by lesson
- `status` - Filter by status

#### POST /api/academy/progress/lessons/:lessonId

Mark/update progress for a lesson.

Request body:
```json
{
  "status": "completed",
  "progress_percent": 100
}
```

#### POST /api/academy/progress/modules/:moduleId

Mark/update progress for a module.

#### POST /api/academy/progress/paths/:pathId

Mark/update progress for a learning path.

## Example Workflows

### Creating a Global Lesson Linking to YouTube

```bash
curl -X POST https://api.zoracore.dk/api/academy/lessons \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Understanding Carbon Footprints",
    "description": "A beginner-friendly introduction to carbon footprints.",
    "content_type": "video",
    "source_type": "youtube",
    "source_url": "https://www.youtube.com/watch?v=example",
    "duration_minutes_estimated": 15,
    "language_code": "en",
    "difficulty_level": "beginner",
    "primary_topic_code": "energy",
    "tags": ["climate_basics", "carbon", "intro"]
  }'
```

### Creating a Module + Learning Path for GOES GREEN Households

1. Create lessons first (see above)
2. Create a module with those lessons:

```bash
curl -X POST https://api.zoracore.dk/api/academy/modules \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "GOES_GREEN_HOUSEHOLD_BASICS",
    "title": "GOES GREEN Basics for Households",
    "description": "Learn the fundamentals of green energy for your home.",
    "primary_topic_code": "energy",
    "target_audience": "households",
    "estimated_duration_minutes": 45,
    "lessons": [
      { "lesson_id": "<lesson-1-uuid>", "lesson_order": 1 },
      { "lesson_id": "<lesson-2-uuid>", "lesson_order": 2 }
    ]
  }'
```

3. Create a learning path with modules:

```bash
curl -X POST https://api.zoracore.dk/api/academy/paths \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "GOES_GREEN_HOUSEHOLD_PATH",
    "title": "GOES GREEN Journey for Households",
    "description": "Complete path to understanding and achieving green energy.",
    "target_audience": "households",
    "recommended_for_profile_type": "household",
    "primary_topic_code": "energy",
    "modules": [
      { "module_id": "<module-1-uuid>", "module_order": 1 },
      { "module_id": "<module-2-uuid>", "module_order": 2 }
    ]
  }'
```

### Tracking User Progress

```bash
# Mark a lesson as completed
curl -X POST https://api.zoracore.dk/api/academy/progress/lessons/<lesson-id> \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "progress_percent": 100
  }'

# Get all progress for current user
curl https://api.zoracore.dk/api/academy/progress \
  -H "Authorization: Bearer <JWT>"
```

## Integration with Other Modules

### GOES GREEN Integration

Lessons and modules can be tagged with "goes_green" and target_audience = "households" or "organizations" to link them to GOES GREEN profiles. Future iterations may include:

- Automatic lesson recommendations based on GOES GREEN profile status
- Linking completed lessons to GOES GREEN actions
- Progress tracking tied to energy goals

### Climate OS Integration

Lessons can be linked to Climate OS mission categories via primary_topic_code and tags. This allows:

- Suggesting relevant lessons when users view missions
- Tracking learning progress alongside mission completion
- Providing educational context for climate actions

### Quantum Climate Lab / Foundation

Topics like "quantum_climate" and "foundation" can be used to filter content related to these modules. This enables:

- Specialized learning paths for advanced climate science
- Foundation project-related educational content

## Future Extensions

### Quiz Engine

The schema includes academy_quizzes and academy_quiz_attempts tables for future quiz functionality:

- Multiple choice questions
- Scoring and pass/fail tracking
- Certificates upon completion

### Agent-Driven Recommendations

Future iterations may include LUMINA/EIVOR-driven recommendations:

- Suggest lessons based on user's missions, GOES GREEN actions, or organization type
- Record recommendation reasons in EIVOR's memory
- Personalized learning paths based on user behavior

### Per-Country/Language Catalogs

The language_code field supports future multi-language content:

- Country-specific lesson catalogs
- Localized content recommendations
- Regional climate topics

## Journal Integration

Academy events are logged to the journal system:

- `academy_lesson_created` - When a new lesson is created
- `academy_module_created` - When a new module is created
- `academy_path_created` - When a new learning path is created
- `academy_user_progress_updated` - When user completes a lesson (logged as `user_feedback` category)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-01 | Initial release with lessons, modules, paths, and progress tracking |
