# site

personal portfolio — [ojasv.tech](https://ojasv.tech) (once pointed here).

plain `index.html` + `style.css` + `site.js`. no build, no framework, no
tracker. photographs are hotlinked from wikimedia commons (cc by-sa) and
converted to ascii **live in the browser** on a canvas; the only "video" is
one youtube embed behind a click-to-load facade.

## deploy

github pages (recommended for this repo name `site`):

```
settings → pages → source: deploy from a branch → main / (root) → save
```

or vercel: import the repo, framework "other", build command none.

### custom domain

`ojasv.tech` currently serves the algorithm visualizers. to move the portfolio
to the root, point the domain here (pages: add `ojasv.tech` (+ `www`) in
settings → pages → custom domain, then update the dns records vercel shows)
and move the visualizers to a subpath like `/algo` or a subdomain
`algo.ojasv.tech`.

## local

```
python3 -m http.server 8000
```

the ascii renderer needs http (not file://) because of canvas cors rules.
