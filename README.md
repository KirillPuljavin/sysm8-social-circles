# TheCord - Social Webbapplikation

**Kurs:** Molntjänster och säkerhet (Practical DevOps Production)

**Produktionsmiljö:** [https://nice-meadow-08f13c403.2.azurestaticapps.net]

## Om Projektet

TheCord är en social plattform för slutna användargrupper, utvecklad som projektuppgift för kursen Molntjänster och säkerhet. Syftet är att demonstrera säker molndrift med automatiserade flöden och rollbaserad åtkomstkontroll.

Applikationen tillåter användare att skapa servrar (motsvarande uppgiftens "circles"), bjuda in medlemmar via delningslänkar, och kommunicera i realtid med rollbaserade begränsningar. Systemet implementerar en trestegsroll-hierarki där Owner har full kontroll, Moderator kan moderera innehåll, och Guest har begränsad åtkomst.

### Terminologi: "Circles" och "Servers"

Uppgiftskraven specificerar "circles" som användargrupper. I denna implementation används genomgående termen "Server" i kod och användargränssnitt. Detta är branschstandard inom community-plattformar som Discord och Slack, och representerar samma koncept: en avgränsad användargrupp med rollbaserad åtkomstkontroll. En Server är funktionellt samma som Circle.

## Teknisk Stack

Applikationen är byggd med Next.js 16 (App Router) och TypeScript, med Prisma ORM som databas-abstraktion mot PostgreSQL i Supabase. Autentisering hanteras av Azure Static Web Apps inbyggda identitetslager med Google OAuth, vilket eliminerar behovet av dedikerad autentiseringsmiddleware. Styling genomförs med SCSS Modules, och all input valideras med Zod-scheman både på klient och server nivå.

Projektet är driftsatt på Azure Static Web Apps i Hybrid Mode, vilket kombinerar statisk webbhosting med server-side rendering och API-routes. CI/CD-pipelinen är implementerad via GitHub Actions med OIDC-autentisering, vilket innebär att inga långlivade secrets lagras i repot.

## Navigation

Projektet är uppbyggt för att maximera separation av ansvarsområden (Modularitet).

### Backend-struktur

- **`/src/app/api/servers`** - REST-endpoints för serverhantering (POST, GET, PATCH, DELETE)
- **`/src/app/api/servers/[id]/members`** - Medlemshantering (lista, uppdatera roll, kicka)
- **`/src/app/api/servers/[id]/messages`** - Meddelandehantering med cursor-baserad pagination
- **`/src/app/api/user/export`** - GDPR data export (GET - returnerar all användardata som JSON)
- **`/src/app/api/user/delete`** - GDPR kontoradering (DELETE - anonymiserar meddelanden, raderar konto)
- **`/src/lib/rbac.ts`** - Centraliserad logik för rollbaserad åtkomstkontroll (9 funktioner)
- **`/src/lib/auth.ts`** - Autentiseringslogik med JIT-sync mot databas
- **`/src/lib/validations`** - Zod-scheman för strikt validering av all input
- **`/prisma/schema.prisma`** - Databasschema (User, Server, Member, Message, Conversation, DirectMessage)

### Frontend-struktur

- **`/src/app/page.tsx`** - Landningssida med marknadsföring och inloggning
- **`/src/app/servers/page.tsx`** - Serverlista med create/delete/invite-funktionalitet
- **`/src/app/servers/[id]/page.tsx`** - Server-chatt med 2-kolumnslayout (meddelanden + medlemmar)
- **`/src/app/invite/[code]/page.tsx`** - Automatisk serverinbjudan via delningslänk
- **`/src/app/settings/page.tsx`** - Kontoinställningar med GDPR-funktioner (data export, kontoradering)
- **`/src/components/chat`** - Chattkomponenter (MessageList, MessageInput, ChatContainer, MembersList)
- **`/src/components/settings`** - GDPR-komponenter (GdprActions för export och radering)
- **`/src/styles/theme.scss`** - Single-file SCSS-arkitektur (1021 rader, WCAG AAA-compliant)

### Konfiguration och infrastruktur

- **`staticwebapp.config.json`** - Azure SWA-konfiguration för routing, säkerhetsheaders (CSP, HSTS), och autentisering vid edge-nivå
- **`.github/workflows`** - CI/CD-pipeline med quality gates (lint, audit, test, migrations, deploy)
- **`package.json`** - Beroenden (Next.js 16, Prisma, Zod, Vitest)

### CI/CD & Feature Slicing

Funktionalitet har utvecklats och driftsatts i vertikala delar (t.ex. Auth, Server CRUD, Messaging). Varje feature har en dedikerad gren (`feature/*`) och en Pull Request (PR) som triggar automatiserade tester och byggsteg. Detta arbetssätt säkerställer att produktion aldrig innehåller ofärdig kod och att varje merge är en deploybar enhet. Dessutom så skapas det test-miljöer för varje PR i Azure SWA som kan testas parallelt och separat från main produktion miljön.

### Git-flöde

Projektet följer en strikt feature-branching strategi:

1. **Feature Branch** - Utveckling sker i isolerad gren
2. **Pull Request** - Skapar automatisk preview-miljö i Azure
3. **Quality Gates** - Pipeline verifierar kod innan merge
4. **Merge to Main** - Automatisk driftsättning till produktion

### Quality Gates

Pipelinen kör sex steg i sekvens för varje Pull Request:

1. **Dependency Check** - Frozen lockfile säkerställer reproducerbara byggen
2. **Security Audit** - `pnpm audit --audit-level=high` blockar vulnerabilities
3. **Linting** - Kod syntax verifieras via ESLint
4. **Unit Tests** - Vitest-tester körs
5. **Database Migrations** - Prisma-migrationer appliceras automatiskt (ändringar i data modeler från prisma schemat syncas)
6. **Deployment** - Azure SWA deploy med OIDC-autentisering

Om något steg misslyckas blockeras merge och deployment automatiskt.

## Arkitektur och Säkerhet

### API Management

Azure API Management fungerar som reverse proxy framför Static Web App, vilket möjliggör infrastruktur-nivå säkerhet. APIM applicerar rate limiting baserat på IP-adress (15 anrop per 60 sekunder) innan trafik når Next.js-applikationen. Detta skyddar mot DoS/Flood-attacker och exponerar `x-rate-limit-remaining` header för klienter. Eftersom Azure SWA i Next.js Hybrid Mode inte stöder backend linking konfigureras APIM som front-proxy istället, vilket är enterprise-standard mönster för API gateway-krav.

### Säkerhetsautentisering i CI/CD

OIDC (OpenID Connect) används för autentisering mellan GitHub Actions och Azure. Istället för att lagra statiska API-tokens i repository genererar GitHub dynamiska ID-tokens som löper ut efter fem minuter. Detta eliminerar risken för läckta credentials och följer zero-trust principer.

### Autentisering I Appen

Azure Static Web Apps hanterar autentisering på edge-nivå genom att använda en `x-ms-client-principal` header vid varje request. Applikationen parsar denna header och synkroniserar användare med databasen vid första inloggning (Just-In-Time provisioning). Detta arkitekturmönster, som Azure kallar "Gold Standard", flyttar autentiseringslogik från applikationslager till infrastrukturlager.

Rollbaserad åtkomstkontroll (RBAC) implementeras genom nio rena funktioner i `src/lib/rbac.ts`. Varje funktion tar användar-ID och resurs-ID som parametrar och returnerar en boolean efter att ha verifierat behörighet mot databasen. Detta designmönster möjliggör enhetstestning utan mock-databas och håller auktoriseringslogik separerad från business logic.

### Säkerhetsheaders och Input-validering

Säkerhetsheaders konfigureras i `staticwebapp.config.json` och inkluderar Content Security Policy, HSTS, X-Frame-Options och andra OWASP-rekommenderade headers. CSP-policyn tillåter endast scripts från samma origin (domän).

All input från användare valideras med Zod-scheman före databas operationer. Varje API-endpoint parsar request body genom ett schema som definierar tillåtna fält, datatyper, och constraints. Valideringsfel returneras med specifika felmeddelanden som indikerar vilket fält som bryter mot vilken regel.

### RBAC

Åtkomst till funktioner styrs av en matris där varje roll har specifika behörigheter:

**Owner** har fullständig kontroll över servern: skapa och radera servern, ändra inställningar, befordra och degradera medlemmars roller, kicka alla utom sig själv, och radera alla meddelanden.

**Moderator** kan moderera innehåll: kicka gäster, radera meddelanden från gäster och andra moderatorer, samt generera inbjudningslänkar.

**Guest** har minimal åtkomst: kan posta meddelanden i normala servrar (men inte i restricted servers), och radera egna meddelanden.

Denna matris implementeras genom funktioner som `canKickMember`, `canDeleteMessage`, och `canEditServer` vilka validerar både den agerade användarens roll och målresursens ägare innan operation tillåts.

### Data Minimization och GDPR

Endast nödvändig persondata lagras (`email`, `azureId`, `name`). Inga känsliga attribut som IP-adresser, location data eller device fingerprints sparas. Databasschemat följer GDPR-principen om dataminimering.

Vid kontoradering anonymiseras användarens meddelanden istället för att raderas, vilket bevarar konversationshistorik för andra medlemmar samtidigt som personuppgifter tas bort. Raderade användare visas som "[Deleted User]" i användargränssnittet. Användarens servrar, medlemskap och personuppgifter raderas helt via cascade delete.

### Skydd mot attacker

**Input Sanering:** All användarinput valideras med Zod-scheman både på klient och server. SQL-injection förhindras via Prisma ORM:s prepared statements.

**XSS-skydd:** Content Security Policy blockerar inline scripts förutom Next.js hydration. React escape:ar automatiskt alla användarinputs i JSX.

**Clickjacking:** X-Frame-Options: DENY förhindrar att sidan embedds i Iframes.

**CSRF:** Azure SWA hanterar CSRF-tokens automatiskt via SameSite cookies (samma domän där appen är i produktion).

**Rate Limiting:** Implementerat via Azure API Management som agerar reverse proxy framför applikationen. IP-baserad throttling (15 anrop per 60 sekunder) skyddar mot flood-attacker på infrastrukturnivå innan trafik når Next.js. Policy definierad i `/infra/apim/rate-limit-policy.xml`.

## Användarscenarier

Ett typiskt flöde börjar med att en användare skapar en server genom att ange namn och välja om servern ska vara restricted (vilket begränsar gästers möjlighet att posta). Systemet genererar en unik inbjudningskod och användaren kan dela länken med andra anvöndare. När en mottagare klickar på länken autentiseras de via Google OAuth om de inte redan är inloggade, och läggs automatiskt till som Guest i servern.

Owner kan sedan promote utvalda medlemmar till Moderator-rollen, vilket ger dem rätt att moderera innehåll från gäster. Om en gäst bryter mot regler kan Moderator eller Owner kicka medlemmen, vilket tar bort deras åtkomst till servern. Meddelanden som redan postats bevaras även efter att en medlem kickats.

Meddelandeborttagning följer en fyrstegsregel: alla kan radera sina egna meddelanden, Moderator och Owner kan radera gäst-meddelanden, Moderator och Owner kan radera andra moderatorers meddelanden, men endast Owner kan radera Owner-meddelanden. Denna matris implementeras både i backend-validering och frontend-UI där raderingsknappar endast visas om användaren har behörighet.

## Beslut I Arkitekturen

Valet av Azure Static Web Apps (SWA) som primär plattform möjliggör användning av Managed Authentication, vilket innebär att autentiseringen sker på edge-nivå via den inbyggda infrastrukturen. Genom att delegera identitetshanteringen uppnås en strikt separation mellan autentisering (plattformstyrd) och auktorisering (applikationsstyrd), vilket minskar attackytan då hantering av känsliga inloggningsuppgifter undviks helt. Detta medger fullt fokus på Role-Based Access Control (RBAC) inom affärslogiken, där verifierade "claims" från Azure används för att styra behörigheter på ett säkert och spårbart sätt.

För realtidsuppdateringar av meddelanden används 2-sekunders polling istället för WebSockets. Detta beslut baserades på att Azure Static Web Apps kräver separat Azure SignalR-tjänst för WebSocket-support vilket innebär extra kostnad och komplexitet. För projektets omfattning med begränsat antal samtidiga användare är polling-lösningen tillräcklig.

Zod valdes för input-validering eftersom biblioteket genererar TypeScript-typer direkt från valideringsscheman, vilket säkerställer att frontend och backend delar samma type definitions. Detta eliminerar risk för type mismatches mellan API-kontrakt och implementering, och används istället för typiska DTOs (som är vanliga i .NET backend).

## Drift & Miljö

### Produktionsmiljö

Applikationen körs i Azure Static Web Apps och uppdateras automatiskt vid varje merge till `main`-grenen. Azure hanterar global CDN-distribution, TLS-certifikat, edge-level autentisering och hybrid rendering (statiska assets + SSR + API routes).

### Databasmiljö

PostgreSQL körs i Supabase med connection pooling via Prisma. Två connection strings används:

- **DATABASE_URL** - Pooled connection för queries (port 6543)
- **DIRECT_URL** - Direct connection för migrations (port 5432)

Migrationer körs automatiskt i CI/CD-pipeline före deployment, liknar Migrations med Entity Framework i .NET.

## Testning

Projektet innehåller omfattande testtäckning med 59 enhetstester via Vitest-ramverket, fördelade över tre huvudområden:

- **RBAC-funktioner** (18 BDD-scenarion): Verifierar alla behörighetsregler för message/member/role-hantering
- **Zod-validering** (25 tester): Säkerställer korrekt input-validering och skydd mot injection-attacker
- **Invite-systemet** (13 tester): Bekräftar kodgenerering, join-flöde och säkerhetslogik

Testsviten körs automatiskt i CI/CD-pipeline och blockerar deployment vid fel.

### Övervakning

Application Insights är aktiverat i Azure-miljön för produktionsövervakning av fel och prestanda. Telemetri samlas in automatiskt från Next.js-applikationen och Azure Static Web Apps-infrastrukturen.

## Användarens Data Hantering

Användare kan exportera all sin persondata via inställningssidan (`/settings`), vilket genererar en JSON-fil med profil, medlemskap, ägda servrar och meddelanden. Detta uppfyller GDPR:s krav på dataportabilitet och rätten till åtkomst.

Kontoradering sker via samma inställningssida och raderar användarens profil samt alla personuppgifter. Istället för att radera meddelanden helt, vilket skulle förstöra konversationshistoriken för andra medlemmar, anonymiseras de genom att ta bort länken till användarkontot. Anonymiserade meddelanden visas som "[Deleted User]" i gränssnittet, vilket följer samma mönster som Discord och Reddit använder för att balansera GDPR-compliance med användbarhet.

Om användaren äger servrar raderas dessa helt med cascade delete av alla medlemmar och meddelanden i de servrarna, vilket säkerställer att ingen persondata kvarstår.

## Reflektion och Lärandemål

Projektet demonstrerar feature-by-feature development där varje funktionalitet isoleras, testas, och driftsätts oberoende. Detta arbetssätt möjliggör kontinuerlig delivery och reducerar risk för regression bugs.

Största tekniska utmaningen var Azure Static Web Apps auth-loop där Next.js middleware skapade redirect-loopar. Problemet löstes genom att ta bort middleware helt och låta Azure hantera autentisering på edge-nivå enligt deras rekommenderad enterprise-arkitektur.

Next.js 16 introducerade breaking changes där route parameters blev asynkrona, vilket krävde refaktorering av alla dynamic routes. Prisma migrations krävde separat DIRECT_URL.

Arkitektur kompromisser inkluderar polling istället för WebSockets för enkelhet, monolitisk app istället för microservices för projektets omfattning, och en hybrid Next.js applikation som kombinerar FE-BE med inbyggda routes som körs på gemensam Node, istället för separat .NET backend server resurs.

## Installation och Lokal Utveckling

Projektet kräver Node.js 20 eller senare samt pnpm som package manager. Efter att ha klonat repository installeras dependencies med `pnpm install`. Databas-konfiguration sker via `.env` fil med `DATABASE_URL` och `DIRECT_URL` som pekar mot PostgreSQL-instans. Databasmigrationer körs med `pnpm exec prisma migrate deploy` följt av `pnpm exec prisma generate` för att generera Prisma client. Utvecklingsserver startas med `pnpm dev` och körs på localhost:3000.

I utvecklingsläge används en mock-användare vilket eliminerar behovet av OAuth-konfiguration lokalt, som är praktiskt omöjligt pga säkerhetsskäl (localhost istället för produktion domän).

## Dokumentation

Förutom denna README finns detaljerad git-historik som spårar varje features utveckling från branch till Pull Request till deployment. Varje commit följer conventional commits-format med prefix som feat, fix, docs, och refactor.

Inline-dokumentation finns i källkoden där RBAC-funktioner kommenteras med regler och användningsexempel, API-routes dokumenteras med parameter-typer och returvärden, och Zod-scheman inkluderar felmeddelanden för varje validering.
