Place production font files here to bundle Gilroy with the app:

- `Gilroy-Light.woff2`
- `Gilroy-Regular.woff2`
- `Gilroy-Medium.woff2`
- `Gilroy-Bold.woff2`

The current CSS already switches the UI to the `Gilroy` family and falls back to the closest system stack when local files are not available.
If you want fully bundled fonts instead of relying on locally installed Gilroy, extend each `@font-face` rule in [`styles.css`](/c:/Users/efily/Downloads/anaelacademy/anaelacademy/styles.css) with `url("./assets/fonts/<file>.woff2") format("woff2")`.
