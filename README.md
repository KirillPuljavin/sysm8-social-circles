# TheCord - Social Webbapplikation

**Kurs:** Molntjänster och säkerhet (Practical DevOps Production)

**Produktionsmiljö:** [https://nice-meadow-08f13c403.2.azurestaticapps.net]

## Om Projektet

TheCord är en social plattform för slutna användargrupper, utvecklad som projektuppgift för kursen Molntjänster och säkerhet. Syftet är att demonstrera säker molndrift med automatiserade flöden och rollbaserad åtkomstkontroll.

Applikationen tillåter användare att skapa servrar (motsvarande uppgiftens "circles"), bjuda in medlemmar via delningslänkar, och kommunicera i realtid med rollbaserade begränsningar. Systemet implementerar en trestegsroll-hierarki där Owner har full kontroll, Moderator kan moderera innehåll, och Guest har begränsad åtkomst.

### Terminologi: "Circles" och "Servers"

Uppgiftskraven specificerar "circles" som användargrupper. I denna implementation används genomgående termen "Server" i kod och användargränssnitt. Detta är branschstandard inom community-plattformar som Discord och Slack, och representerar samma koncept: en avgränsad användargrupp med rollbaserad åtkomstkontroll. En Server är funktionellt samma som Circle.

## Teknisk Stack

Next.js 16 med App Router valdes som ramverk eftersom projektet kräver både dynamiskt innehåll (chat, medlemslistor) och API-endpoints i samma applikation. App Router möjliggör server-side rendering för bättre SEO och initial load, samtidigt som React-komponenter hanterar interaktivitet på klienten. Detta eliminerar behovet av separat backend-server. API-routes körs som serverless functions direkt i Next.js, vilket förenklar deployment och minskar infrastrukturkomplexitet.

TypeScript används för att fånga typ-fel vid kompilering istället för runtime. När en funktion förväntar sig en `userId: string` och få `undefined` upptäcks det direkt i editorn, inte när en användare triggar buggen i produktion. TypeScript fungerar också som levande dokumentation: funktionssignaturer visar exakt vilka parametrar som krävs och vad som returneras.

Prisma ORM valdes för databas-access mot PostgreSQL i Supabase eftersom det kombinerar type-safety med migrations. Prisma genererar TypeScript-typer direkt från databasschemat, vilket innebär att om `User`-tabellen har ett `email`-fält kan koden inte kompilera om den försöker läsa `user.emal` (typo). Migrationer hanteras deklarativt: man definierar önskat schema och Prisma genererar SQL-migrations automatiskt, vilket liknar Entity Framework i .NET-världen. Prepared statements är inbyggt, vilket förhindrar SQL-injection utan extra kod.

Styling implementerades i en enda global SCSS-fil (`src/styles/theme.scss`) istället för component-level CSS modules eller Tailwind. Filen innehåller design tokens, komponentmönster och utilities i ett enda källdokument. Detta var ett medvetet val för snabb implementation under projektdeadline. Att bygga en modular CSS-arkitektur med separata filer per komponent tar tid som projektet inte hade. Snabbare utveckling och garanterad visuell konsistens vägdes mot att man förlorar component encapsulation och risker för namnkonflikter om projektet växer. För kursprojektets scope (1021 rader SCSS) fungerade single-file-approach bra.

Zod valdes för input-validering eftersom biblioteket genererar TypeScript-typer direkt från valideringsscheman. Istället för att definiera typer separat och sedan skriva validering manuellt (som riskerar drift mellan dem), definieras ett Zod-schema och både runtime-validering och compile-time-typer följer automatiskt. Detta säkerställer att frontend och backend delar exakt samma förståelse för vad som är giltig input.

Azure Static Web Apps i Hybrid Mode används som deployment-plattform enligt kurskrav. Plattformen erbjuder managed authentication där Google OAuth hanteras på edge-nivå utan att applikationskoden behöver hantera OAuth-flows, automatisk TLS, global CDN, och stöd för både statiska filer och serverless API-routes. Hybrid Mode innebär att statiska assets (JS, CSS, bilder) serveras från CDN medan dynamiska requests (API-calls, SSR) går till serverless Node.js-runtime. Utöver kravet på Azure-deployment valdes Static Web Apps specifikt för dess inbyggda autentiseringslager, vilket förenklar identity management jämfört med att själv implementera OAuth-flows. CI/CD sker via GitHub Actions med OIDC-autentisering, vilket eliminerar behovet av statiska deployment-tokens som kan läcka.

## Navigation

Projektet är uppbyggt för att maximera separation av ansvarsområden (Modularitet).

#### Backend-struktur

- **`/src/app/api/servers`** - REST-endpoints för serverhantering (POST, GET, PATCH, DELETE)
- **`/src/app/api/servers/[id]/members`** - Medlemshantering (lista, uppdatera roll, kicka)
- **`/src/app/api/servers/[id]/messages`** - Meddelandehantering med cursor-baserad pagination
- **`/src/app/api/user/export`** - GDPR data export (GET - returnerar all användardata som JSON)
- **`/src/app/api/user/delete`** - GDPR kontoradering (DELETE - anonymiserar meddelanden, raderar konto)
- **`/src/lib/rbac.ts`** - Centraliserad logik för rollbaserad åtkomstkontroll (9 funktioner)
- **`/src/lib/auth.ts`** - Autentiseringslogik med JIT-sync mot databas
- **`/src/lib/validations`** - Zod-scheman för strikt validering av all input
- **`/prisma/schema.prisma`** - Databasschema (User, Server, Member, Message, Conversation, DirectMessage)

#### Frontend-struktur

- **`/src/app/page.tsx`** - Landningssida med marknadsföring och inloggning
- **`/src/app/servers/page.tsx`** - Serverlista med create/delete/invite-funktionalitet
- **`/src/app/servers/[id]/page.tsx`** - Server-chatt med 2-kolumnslayout (meddelanden + medlemmar)
- **`/src/app/invite/[code]/page.tsx`** - Automatisk serverinbjudan via delningslänk
- **`/src/app/settings/page.tsx`** - Kontoinställningar med GDPR-funktioner (data export, kontoradering)
- **`/src/components/chat`** - Chattkomponenter (MessageList, MessageInput, ChatContainer, MembersList)
- **`/src/components/settings`** - GDPR-komponenter (GdprActions för export och radering)
- **`/src/styles/theme.scss`** - Single-file SCSS-arkitektur (1021 rader, WCAG AAA-compliant)

#### Konfiguration och infrastruktur

- **`staticwebapp.config.json`** - Azure SWA-konfiguration för routing, säkerhetsheaders (CSP, HSTS), och autentisering vid edge-nivå
- **`.github/workflows`** - CI/CD-pipeline med quality gates (lint, audit, test, migrations, deploy)
- **`package.json`** - Beroenden (Next.js 16, Prisma, Zod, Vitest)

## CI/CD & Feature Slicing

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

Kursbedömningen kräver Azure API Management (APIM) framför applikationen. Hur APIM konfigureras beror på backend-arkitekturen, vilket skiljer sig fundamentalt från traditionell frontend-backend-separation.

**Traditionell separation:** Frontend (React som statiska filer) deployad separat från backend (.NET Web API som egen tjänst). I denna modell kan APIM konfigureras med "backend linking" där APIM pekar direkt på backend-tjänstens URL och routar trafik dit.

**Vår arkitektur:** Next.js i Azure Static Web Apps Hybrid Mode innebär att frontend OCH backend-logik deployad som en enda enhet. API-routes (`/api/*`) körs inte som en separat server utan som serverless functions inom SWA-miljön. Detta är en monolitisk deployment som kombinerar statiska assets och dynamiska endpoints.

Eftersom SWA Hybrid Mode inte exponerar en separat backend-URL att länka till, måste APIM konfigureras som **reverse proxy**. En reverse proxy är en mellanhand som tar emot klientens request, applicerar policies (rate limiting, säkerhet), och vidarebefordrar requesten till backend-tjänsten som om proxyn vore en vanlig klient. Reverse proxy-mönstret används när man vill lägga ett skyddslager framför en applikation utan att applikationen själv behöver implementera dessa skydd.

I vår konfiguration:

1. Klient skickar request → APIM (publik endpoint)
2. APIM applicerar IP-baserad throttling (15 anrop per 60 sekunder)
3. Om rate limit inte överskrids, vidarebefordras request → Azure SWA
4. SWA processar request (antingen statisk fil eller serverless function)
5. Response går tillbaka genom APIM → klient

Detta skyddar mot DoS/Flood-attacker på infrastrukturnivå innan trafik når Next.js-applikationen. APIM exponerar `x-rate-limit-remaining` header så att klienter kan se hur många requests de har kvar. Policyn är definierad i XML-format (`/infra/apim/rate-limit-policy.xml`) och deployad manuellt via Azure Portal eftersom SWA inte stöder automatisk APIM-konfiguration via pipeline.

### Säkerhetsautentisering i CI/CD

OpenID Connect (OIDC) är ett identitetsfederations-protokoll som möjliggör att en tjänst kan bevisa sin identitet för en annan tjänst utan att dela långlivade secrets. Fundamentalt fungerar det genom att GitHub och Azure delar en förtroendekedja baserad på kryptografiska signaturer istället för statiska lösenord.

När CI/CD-pipelinen körs genererar GitHub Actions en JWT (JSON Web Token) som innehåller metadata om workflow-körningen: vilket repository som kör jobbet, vilken branch, och vilken commit. Denna token signeras kryptografiskt med GitHubs privata nyckel. Azure har i förväg konfigurerats att lita på GitHubs publika nyckel och kan därmed verifiera att token verkligen kommer från GitHub och inte har manipulerats.

Azure validerar sedan claims i token mot förkonfigurerade regler: "Tillåt endast tokens från repository `KirillPuljavin/sysm8-social-circles` på branch `main`". Om validering lyckas utfärdar Azure ett tillfälligt access token som ger deployment-behörighet i exakt 5 minuter, precis tillräckligt länge för att slutföra deployment-operationen.

Detta innebär att inga långlivade credentials behöver lagras i GitHub repository eller GitHub Secrets. Även om någon komprometterar repository-innehållet finns ingen token att stjäla. Angriparen skulle behöva äga både GitHubs signeringsnyckel (omöjligt) och köra från rätt repository och branch (blockerat av claims-validering) för att få deployment-åtkomst.

Valet av OIDC gjordes för att eliminera det största säkerhetsproblemet med klassisk CI/CD: statiska deployment-tokens som läcker i commits, logs eller komprometterade GitHub Actions secrets. Med OIDC är varje deployment-session unikt autentiserad med kort-livade credentials, vilket följer principen om least privilege och just-in-time access.

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

Säkerhetsarkitekturen bygger på principen om defense-in-depth, där varje attackvektor möts av specifika försvar som fungerar både på infrastruktur- och applikationsnivå.

Input-validering är den första barriären. Varje gång användaren skickar data valideras den med Zod-scheman både i webbläsaren (för omedelbar feedback) och på servern (för säkerhet). Schemana definierar exakta regler för längd, tecken och obligatoriska fält. Om valideringen misslyckas får användaren ett konkret felmeddelande som förklarar vad som är fel, istället för att applikationen kraschar eller accepterar ogiltig data. Detta skyddar mot både oavsiktliga fel och avsiktliga manipulationsförsök.

SQL-injection förhindras genom att Prisma ORM används för all databasaccess. Istället för att konkatenera användarinput direkt in i SQL-frågor (den klassiska sårbarheten) använder Prisma prepared statements där parametrar hanteras separat från frågestrukturen. Även om någon försöker injicera SQL-kod via ett textfält tolkas det alltid som data och aldrig som körbar kod.

XSS-attacker (Cross-Site Scripting) blockeras genom en kombination av Content Security Policy och Reacts inbyggda escaping. CSP-headern konfigurerad i `staticwebapp.config.json` instruerar webbläsaren att endast köra scripts från samma domän, vilket blockerar extern skadlig kod. React hanterar dessutom automatisk escaping av all användarinput i komponenter. Om någon försöker posta `<script>alert('xss')</script>` i chatten renderas det som text istället för att köras som kod.

Clickjacking-attacker, där angripare lägger en osynlig iframe över legitima knappar för att lura användare, förhindras med `X-Frame-Options: DENY`. Headern säger åt webbläsaren att aldrig tillåta sidan visas i en iframe, vilket eliminerar attackytan helt.

CSRF-skydd (Cross-Site Request Forgery) hanteras automatiskt av Azure Static Web Apps genom SameSite-cookies. Autentiseringscookies skickas endast med requests från samma domän som applikationen körs på. Om en angripare försöker lura en användare att skicka en request från en annan webbplats skickas inte cookien med, och requesten avvisas som oautentiserad.

Rate limiting implementeras på infrastrukturnivå genom Azure API Management som fungerar som reverse proxy framför applikationen. APIM spårar varje IP-adress och tillåter max 15 anrop per 60 sekunder. Flood-attacker stoppas innan de når Next.js-applikationen, vilket skyddar både applikationslogik och databas från överbelastning. Policyn är definierad i `/infra/apim/rate-limit-policy.xml` och exponerar en `x-rate-limit-remaining` header så att legitima klienter kan se hur många requests de har kvar innan throttling aktiveras.

Tillsammans bildar dessa skydd en försvarslinje där ingen enskild mekanism är kritisk. Säkerheten byggs istället upp genom att kombinera flera oberoende lager som täcker olika attackvektorer. Från infrastruktur (rate limiting, headers) via ramverk (React escaping, Prisma prepared statements) till applikationslogik (Zod-validering, RBAC).

### Användarens Data Hantering

Användare kan exportera all sin persondata via inställningssidan (`/settings`), vilket genererar en JSON-fil med profil, medlemskap, ägda servrar och meddelanden. Detta uppfyller GDPR-krav på dataportabilitet och rätten till åtkomst, vilket är ett explicit krav i kursbedömningen för att hantera användardata ansvarsfullt.

Kontoradering sker via samma inställningssida och raderar användarens profil samt alla personuppgifter. Istället för att radera meddelanden helt, vilket skulle förstöra konversationshistoriken för andra medlemmar, anonymiseras de genom att ta bort länken till användarkontot. Anonymiserade meddelanden visas som "[Deleted User]" i gränssnittet, vilket följer samma mönster som Discord och Reddit använder för att balansera GDPR-compliance med användbarhet.

Om användaren äger servrar raderas dessa helt med cascade delete av alla medlemmar och meddelanden i de servrarna, vilket säkerställer att ingen persondata kvarstår.

## Användarscenarier

Ett typiskt flöde börjar med att en användare skapar en server genom att ange namn och välja om servern ska vara restricted (vilket begränsar gästers möjlighet att posta). Systemet genererar en unik inbjudningskod och användaren kan dela länken med andra anvöndare. När en mottagare klickar på länken autentiseras de via Google OAuth om de inte redan är inloggade, och läggs automatiskt till som Guest i servern.

Owner kan sedan promote utvalda medlemmar till Moderator-rollen, vilket ger dem rätt att moderera innehåll från gäster. Om en gäst bryter mot regler kan Moderator eller Owner kicka medlemmen, vilket tar bort deras åtkomst till servern. Meddelanden som redan postats bevaras även efter att en medlem kickats.

Meddelandeborttagning följer en fyrstegsregel: alla kan radera sina egna meddelanden, Moderator och Owner kan radera gäst-meddelanden, Moderator och Owner kan radera andra moderatorers meddelanden, men endast Owner kan radera Owner-meddelanden. Denna matris implementeras både i backend-validering och frontend-UI där raderingsknappar endast visas om användaren har behörighet.

## Beslut I Arkitekturen

Azure var given som krav, men inom det hade vi val att göra. Static Web Apps med Next.js i Hybrid Mode kändes rätt eftersom det löser autentiseringen åt mig. Istället för att bygga OAuth-flows själv tar Azure hand om det på edge-nivå och ger mig en header med användardata. Det betyder att jag kan fokusera på RBAC-logiken (alltså vem som får göra vad) istället för att tampas med token-refresh och session management. Autentisering blir infrastrukturens problem, auktorisering blir min kod.

Det blev en monolitisk app istället för separation mellan frontend och backend. Next.js API-routes kör som serverless functions i samma deployment som frontend-koden. I en traditionell setup hade jag byggt en .NET Web API som egen tjänst och pekat React mot den, men här är allt i en enhet. Det förenklar deployment och minskar antalet rörliga delar, men innebär också att APIM måste konfigureras som reverse proxy framför hela appen istället för att länka direkt till en backend-tjänst.

För realtidsuppdatering av meddelanden går appen ut och hämtar nya meddelanden var 2:a sekund. Det är inte WebSockets, och det var ett medvetet val. Azure SWA stöder inte WebSockets utan att dra in Azure SignalR som separat tjänst, vilket betyder mer config, mer kostnad, och mer komplexitet. För en chattapp med några samtidiga användare räcker polling. Det är inte elegant, men det fungerar och håller stacken enkel.

Zod för validering var egentligen inte bara ett val för validering. Det var ett val för type safety. Zod-scheman genererar TypeScript-typer automatiskt, vilket betyder att frontend och backend delar exakt samma förståelse för vad som är giltig data. Om jag ändrar ett schema uppdateras typerna överallt, och kompilatorn säger till om något inte stämmer. Det kändes mer robust än att ha separata DTO-klasser som kan drifta isär.

All styling lever i en enda fil (`theme.scss`) istället för att spridas över komponentmoduler eller Tailwind. Det var ett pragmatiskt val. Med den korta tiden jag hade, fanns inget utrymme att bygga komponent-level CSS-arkitektur. En fil med utilities och komponentmönster var snabbare att scaffolda och hålla konsistent. Det offrar komponentinkapsling och skapar risk för namnkonflikter i större skala, men för ett kursprojekt (1021 rader CSS) fungerade det. Bättre att leverera med global styling än att spendera tid på modularisering som projektet inte behövde.

RBAC-funktionerna är rena funktioner som tar ID:n och returnerar en boolean. Inga klasser, ingen state, bara `canUserDoThis(userId, resourceId)`. Det gör dem lätta att testa och lätta att förstå. Permissions-matrisen lever i kod, inte i en databas-tabell, vilket betyder att logiken är synlig och versionshanterad. Om permissions behöver bli mer dynamiska i framtiden måste designen ändras, men för detta projekts scope fungerar det.

Säkerheten byggdes i lager. Rate limiting på infrastrukturnivå stoppar flood innan det når koden. Headers blockerar XSS och clickjacking på protokollnivå. Prisma förhindrar SQL-injection genom prepared statements. Zod validerar input. RBAC kollar permissions. Inget lager är perfekt, men tillsammans täcker de det mesta. Tanken var att inte lita på en enskild mekanism, utan bygga redundans.

Största utmaningen för mig var att få Next.js middleware att sluta skapa redirect-loops med Azure SWA:s auth i början. Lösningen blev att ta bort middleware helt och låta Azure hantera routing-skydd via `staticwebapp.config.json`. Det är Azure:s rekommenderade mönster, men det tog ett tag att inse.

Projektet är inte perfekt. Polling istället för WebSockets är inte optimal. SCSS blev en monolitisk fil. APIM-config är applicerad manuellt till Azure Portalen i nuläget, där taknken var att automatisera och synca via pipeline. Men det fungerar, det är säkert, det är testat, och det deployar stabilt. För ett kursprojekt som ska visa att man förstår DevOps, säkerhet och molndrift känns det tillräckligt.

## Drift & Miljö

#### Produktionsmiljö

Applikationen körs i Azure Static Web Apps och uppdateras automatiskt vid varje merge till `main`-grenen. Azure hanterar global CDN-distribution, TLS-certifikat, edge-level autentisering och hybrid rendering (statiska assets + SSR + API routes).

#### Databasmiljö

PostgreSQL körs i Supabase med connection pooling via Prisma. Två connection strings används:

- **DATABASE_URL** - Pooled connection för queries (port 6543)
- **DIRECT_URL** - Direct connection för migrations (port 5432)

Migrationer körs automatiskt i CI/CD-pipeline före deployment, liknar Migrations med Entity Framework i .NET.

## Testning

Projektet innehåller omfattande testtäckning med 59 enhetstester via Vitest-ramverket, fördelade över fyra huvudområden:

- **RBAC-funktioner** (18 tester): Verifierar alla behörighetsregler för message/member/role-hantering enligt BDD-scenarion
- **Zod-validering** (25 tester): Säkerställer korrekt input-validering och skydd mot injection-attacker
- **Invite-systemet** (13 tester): Bekräftar kodgenerering, join-flöde och säkerhetslogik
- **Sanity-tester** (3 tester): Grundläggande smoke tests för core-funktionalitet

Testsviten körs automatiskt i CI/CD-pipeline och blockerar deployment vid fel.

#### Övervakning

Application Insights är aktiverat i Azure-miljön för produktionsövervakning av fel och prestanda. Telemetri samlas in automatiskt från Next.js-applikationen och Azure Static Web Apps-infrastrukturen.

## Reflektion och Lärandemål

Projektet demonstrerar feature-by-feature development där varje funktionalitet isoleras, testas, och driftsätts oberoende. Detta arbetssätt möjliggör kontinuerlig delivery och reducerar risk för regression bugs.

Största tekniska utmaningen var Azure Static Web Apps auth-loop där Next.js middleware skapade redirect-loopar. Problemet löstes genom att ta bort middleware helt och låta Azure hantera autentisering på edge-nivå enligt deras rekommenderad enterprise-arkitektur.

Next.js 16 introducerade breaking changes där route parameters blev asynkrona, vilket krävde refaktorering av alla dynamic routes. Prisma migrations krävde separat DIRECT_URL.

Arkitektur kompromisser inkluderar polling istället för WebSockets för enkelhet, monolitisk app istället för microservices för projektets omfattning, och en hybrid Next.js applikation som kombinerar FE-BE med inbyggda routes som körs på gemensam Node, istället för separat .NET backend server resurs.

## Installation och Lokal Utveckling

Projektet kräver Node.js 20 eller senare samt pnpm som package manager. Efter att ha klonat repository installeras dependencies med `pnpm install`. Databas-konfiguration sker via `.env` fil med `DATABASE_URL` och `DIRECT_URL` som pekar mot PostgreSQL-instans i Supabase. Databasmigrationer körs med `pnpm exec prisma migrate deploy` följt av `pnpm exec prisma generate` för att generera Prisma client. Utvecklingsserver startas med `pnpm dev` och körs på localhost:3000.

I utvecklingsläge används en mock-användare vilket eliminerar behovet av OAuth-konfiguration lokalt, som är praktiskt omöjligt pga säkerhetsskäl (localhost istället för produktion domän).

## Dokumentation

Förutom denna README finns detaljerad git-historik som spårar varje features utveckling från branch till Pull Request till deployment. Varje commit följer conventional commits-format med prefix som feat, fix, docs, och refactor.

Inline-dokumentation finns i källkoden där RBAC-funktioner kommenteras med regler och användningsexempel, API-routes dokumenteras med parameter-typer och returvärden, och Zod-scheman inkluderar felmeddelanden för varje validering.
