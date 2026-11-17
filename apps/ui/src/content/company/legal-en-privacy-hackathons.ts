import { list, section, subheading, text } from './legal-translated';

export const privacyHackathonsEnglish = section(
  'Hackathons, organisations, projects and certificates',
  [
    subheading('Registering and taking part'),
    ...text(
      'When you register for a hackathon, we store how you will attend, that you confirmed your age where it sets a minimum, whether you are looking for a team, and any skills you enter when registering. We use these to hold your place and to help teams form.',
      'For a team, we store its name and description, its members and captain, requests to join it, and its invite links.',
    ),
    subheading('Submissions, scores and results'),
    ...text(
      'For a submission, we store its title, description, code repository, demo, any pull requests it links, its AI statement, your confirmation that the work is original, and each version the team submitted.',
      'A team can add up to three screenshots to its submission. We re-encode them, which removes their metadata, such as location, and keep them with the submission. Only the team and the hackathon’s judges can open them.',
      'During judging, we store each judge’s scores and comments, and the reason for any recusal. When the results are published, we freeze them: team name, submission title, scores and rank.',
    ),
    subheading('Skills, links and what you are open to'),
    ...text(
      'You can add these to your profile, and you can show your hackathon record there: the hackathons you took part in, won a prize at or judged. Each has its own visibility switch and stays private until you turn it on. If you turn it off, it leaves your public profile the next time the page loads.',
    ),
    subheading('Projects'),
    ...text(
      'A team can turn its submission into a project page: its title, the problem it addresses, a description, its stage and its links. You are named on it, and it appears on your public profile, only if you confirm.',
    ),
    subheading('Certificates'),
    ...text(
      'When the results are published, we issue certificates to team members and judges. A certificate holds your name, the hackathon, the type of certificate, any prize, and a verification code. If a certificate is revoked, its page no longer names you.',
    ),
    subheading('Organisations'),
    ...text(
      'When you apply to register an organisation, we store its name, kind, description, website and country, the review decision, who owns it, and its members and their roles.',
    ),
    subheading('Who sees this'),
    list([
      '**Any visitor:** a hackathon’s page, with the names of its judges and mentors and what mentors wrote about themselves; published results (team name, submission title and scores); an organisation’s page; a published project’s page and the members who confirmed being named on it; and a certificate’s page, for anyone with its link.',
      '**The hackathon’s organisers:** registrations, teams, submissions and judging progress.',
      '**Judges:** submissions as submitted, with each team’s name.',
      '**Participants looking for a team:** your name and skills, if you chose to show that you are looking.',
      '**Your team:** its members, its submission, and the judges’ scores and comments on it, with judges numbered rather than named.',
      '**Moderators:** reports, the submissions and teams they concern, and the decisions taken on them.',
      '**Sponsors and prize providers:** totals only, such as how many people registered. They do not receive your name, your contact details or your scores from us.',
      '**Search engines:** your profile page is marked so that search engines do not list it, unless you turn on its search engines switch. A project’s page is listed only if its team turns that on. Hackathon and organisation pages are public and can be listed.',
    ]),
    subheading('Legal basis and closing your account'),
    ...text(
      'Registration, teams, submissions, judging and certificates rely on the performance of our contract. Publishing your skills, links, what you are open to and your hackathon record relies on your explicit consent, which you can withdraw by turning the switch off. Reports and disqualification decisions rely on our legitimate interest in protecting the competition.',
      'When you close your account, we delete your registrations, your places on teams, as a mentor and on projects, your organisation memberships and your certificates. Submissions and results stay under the team’s name, not yours, and a judge’s scores stay without the judge’s name.',
    ),
  ],
);
