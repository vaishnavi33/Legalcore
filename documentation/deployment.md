# Putting Legal Core online

The simplest production setup is **one server running Docker Compose**, with HTTPS in front of it. A 2 vCPU, 4 GB server (for example AWS Lightsail or EC2 in Mumbai, ap-south-1) is enough to start.

## 1. Prepare the server

```bash
# Ubuntu 24.04
curl -fsSL https://get.docker.com | sh
git clone https://github.com/<you>/legal-core.git && cd legal-core
cp .env.example .env
```

Fill in `.env`:

- `POSTGRES_PASSWORD`: a long random password. Use the same value inside `DATABASE_URL`.
- `SECRET_KEY`: generate one with `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: the first super admin.
- `CORS_ORIGINS`: your domain, for example `["https://legalcore.in"]`.
- `COOKIE_SECURE=true`: keep this on once HTTPS is set up.
- `NEXT_PUBLIC_CONTACT_*`: head office phone, email and WhatsApp (optional).

## 2. Start it

```bash
docker compose up -d --build
docker compose logs -f api      # first start runs migrations and creates the super admin
```

The website runs on port 3000. Branches and services are created automatically. Do **not** run `--demo` in production.

## 3. Add HTTPS

Point your domain's DNS A record to the server, then put Caddy in front. It gets certificates automatically:

```
# /etc/caddy/Caddyfile
legalcore.in, www.legalcore.in {
    reverse_proxy localhost:3000
}
```

## 4. After the first sign-in

1. Sign in with `ADMIN_EMAIL`.
2. Under **Branches and fees**, add each branch's address, phone and email, and each service's fee.
3. Under **People and roles**, add branch managers, drafting staff and advocate reviewers, and pick their branches.

## Backups

```bash
# Daily database backup (add to cron)
docker compose exec -T db pg_dump -U legalcore legalcore | gzip > /backups/legalcore-$(date +%F).sql.gz
# Documents
docker run --rm -v legal-core_uploads:/data -v /backups:/backups alpine tar czf /backups/uploads-$(date +%F).tgz -C /data .
```

Copy backups off the server (for example to S3 with versioning), and test a restore every few months.

## Updating

```bash
git pull && docker compose up -d --build
```

Database migrations run automatically when the API starts.

## Before launch checklist

- [ ] An advocate has reviewed the website wording, the disclaimer and the Knowledge Centre guides against Bar Council of India rules on advertising.
- [ ] A privacy notice for the DPDP Act is published, covering what is collected, why, how long it is kept and who to contact.
- [ ] HTTPS works and `COOKIE_SECURE=true` is set.
- [ ] Backups run and one restore has been tested.
- [ ] Demo accounts do not exist in production.
