# Aqua Mail (web client)

A small, dependency-free webmail client that talks JMAP (RFC 8620 / 8621) to a mail server such as [Stalwart](https://stalw.art). Live at <https://mail.aqu.ac>.

- Reads and sends mail over JMAP: folders, search, starred, reply and reply all, attachments (download).
- HTML mail is shown as plain text, so remote content and scripts never run.
- The session credential stays in the tab (or in local storage only when "Keep me signed in" is ticked).
- `functions/jmap/[[path]].js` is a same-origin proxy (Cloudflare Pages Function) so the browser needs no CORS access to the mail server and the server address stays private.

## Run it

1. Deploy the repository root as a Cloudflare Pages project.
2. Set `JMAP_ORIGIN` (for example `https://mx.example.com`) in the project's environment variables.
3. Open `/app/` and sign in with a mailbox on that server.

The public source is a subset of the production client: the Aqua theme, logo and scene are private (see `NOTICE-ASSETS.md`), and account creation is a separate service.

## License

Functional Source License (FSL-1.1-MIT), see `LICENSE`. Security reports: see `SECURITY.md`.
