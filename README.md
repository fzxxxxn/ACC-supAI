# Blind A/B AAC Review Website

This is a complete static GitHub Pages website for blind review of 100 AAC generation items.

The reviewer-facing page shows:

- one sentence per item,
- two randomized outputs: **Option A** and **Option B**,
- 10 items per page,
- local reviewer ratings for accuracy, safety, symbol clarity, and overall preference,
- exportable reviewer CSV.

The source mapping is **not included in the public review data**. Your private answer key is stored in:

```text
private_DO_NOT_UPLOAD/ab_assignment_key.csv
private_DO_NOT_UPLOAD/ab_assignment_key.json
```

Do **not** upload `private_DO_NOT_UPLOAD/` to a public GitHub repository if you want the review to remain blind.

## Repository structure

```text
.
├── index.html
├── README.md
├── required_images.txt
├── .nojekyll
├── .gitignore
├── assets/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── review_data.js
│   │   └── app.js
│   └── images/
│       └── README.md
├── scripts/
│   └── check_images.py
└── private_DO_NOT_UPLOAD/
    ├── ab_assignment_key.csv
    ├── ab_assignment_key.json
    └── source_summary.json
```

## How to deploy on GitHub Pages

1. Create a new GitHub repository.
2. Upload the public site files:
   - `index.html`
   - `README.md`
   - `.nojekyll`
   - `.gitignore`
   - `required_images.txt`
   - `assets/`
   - `scripts/`
3. Do **not** upload `private_DO_NOT_UPLOAD/` if reviewers may access the repository.
4. Put all required image files into:

```text
assets/images/
```

5. Keep the exact filenames listed in:

```text
required_images.txt
```

6. Enable GitHub Pages:
   - Repository → **Settings** → **Pages**
   - Source: **Deploy from a branch**
   - Branch: `main`
   - Folder: `/root`

## Review process

Reviewers can open the webpage, review 10 items per page, select A/B/Tie/Neither for each criterion, add notes, and click **Export review CSV**.

The exported CSV includes:

- review ID,
- original item ID,
- page and position,
- sentence,
- accuracy preference,
- safety preference,
- symbol clarity preference,
- overall preference,
- notes.

## Your private A/B key

Use `private_DO_NOT_UPLOAD/ab_assignment_key.csv` to decode each reviewer's responses. The key tells you the original source for Option A and Option B for every item.

## Check images locally

After adding image files, run:

```bash
python scripts/check_images.py
```

This prints any missing image filenames.
