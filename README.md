# sb1-jbevgfct

[Edit in StackBlitz next generation editor ⚡️](https://stackblitz.com/~/github.com/bobsabra/sb1-jbevgfct)

## Deploying Supabase functions

The `serve-tracker` and `event-capture` edge functions must be deployed with the `--no-verify-jwt` flag. This allows the browser to fetch the tracker script and submit events without providing an `Authorization` header.

If you would rather keep JWT verification enabled, modify the tracker to use `fetch` with an `Authorization` header that contains your project's `anon` key instead of using `sendBeacon`.
