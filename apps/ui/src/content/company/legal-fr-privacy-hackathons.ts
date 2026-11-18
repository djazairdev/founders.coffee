import { list, section, subheading, text } from './legal-translated';

export const privacyHackathonsFrench = section(
  'Hackathons, organisations, projets et attestations',
  [
    subheading('S’inscrire et participer'),
    ...text(
      'Lorsque vous vous inscrivez à un hackathon, nous conservons votre mode de participation, la confirmation de votre âge s’il fixe un minimum, le fait que vous cherchiez ou non une équipe, et les compétences que vous indiquez à l’inscription. Nous les utilisons pour réserver votre place et aider les équipes à se former.',
      'Pour une équipe, nous conservons son nom et sa description, ses membres et son capitaine, les demandes pour la rejoindre et ses liens d’invitation.',
    ),
    subheading('Dépôts, notes et résultats'),
    ...text(
      'Pour un dépôt, nous conservons son titre, sa description, son dépôt de code, sa démo, les pull requests qu’il mentionne, sa déclaration sur l’IA, votre confirmation que le travail est original, et chaque version soumise par l’équipe.',
      'Une équipe peut ajouter jusqu’à trois captures d’écran à son dépôt. Nous les réencodons, ce qui retire leurs métadonnées, comme la localisation, et nous les conservons avec le dépôt. Seuls l’équipe et le jury du hackathon peuvent les ouvrir.',
      'Pendant l’évaluation, nous conservons les notes et commentaires de chaque membre du jury, ainsi que le motif d’un éventuel déport. À la publication des résultats, nous les figeons : nom de l’équipe, titre du dépôt, notes et rang.',
    ),
    subheading('Compétences, liens et ce à quoi vous êtes ouvert'),
    ...text(
      'Vous pouvez les ajouter à votre profil et y afficher votre parcours en hackathon : ceux auxquels vous avez participé, où vous avez remporté un prix ou fait partie du jury. Chaque élément a son propre réglage de visibilité et reste privé tant que vous ne l’activez pas. Si vous le désactivez, il disparaît de votre profil public au prochain chargement de la page.',
    ),
    subheading('Projets'),
    ...text(
      'Une équipe peut transformer son dépôt en page de projet : son titre, le problème qu’il traite, une description, son stade et ses liens. Votre nom n’y figure, et le projet n’apparaît sur votre profil public, que si vous le confirmez.',
    ),
    subheading('Attestations'),
    ...text(
      'À la publication des résultats, nous délivrons des attestations aux membres des équipes et du jury. Une attestation indique votre nom, le hackathon, son type, un éventuel prix et un code de vérification. Si une attestation est retirée, sa page ne vous nomme plus.',
    ),
    subheading('Organisations'),
    ...text(
      'Lorsque vous demandez à enregistrer une organisation, nous conservons son nom, son type, sa description, son site web et son pays, la décision d’examen, son propriétaire, ainsi que ses membres et leurs rôles.',
    ),
    subheading('Qui voit ces données'),
    list([
      '**Tout visiteur :** la page d’un hackathon, avec les noms des membres du jury et des mentors et ce que les mentors ont écrit sur eux-mêmes ; les résultats publiés (nom de l’équipe, titre du dépôt et notes) ; la page d’une organisation ; la page d’un projet publié et les membres qui ont confirmé y figurer ; et la page d’une attestation, pour quiconque en a le lien.',
      '**Les organisateurs du hackathon :** les inscriptions, les équipes, les dépôts et l’avancement de l’évaluation.',
      '**Le jury :** les dépôts tels que soumis, avec le nom de chaque équipe.',
      '**Les participants qui cherchent une équipe :** votre nom et vos compétences, si vous avez choisi d’indiquer que vous en cherchez une.',
      '**Votre équipe :** ses membres, son dépôt, ainsi que les notes et commentaires du jury sur celui-ci, les membres du jury étant numérotés et non nommés.',
      '**Les modérateurs :** les signalements, les dépôts et équipes concernés et les décisions prises.',
      '**Les sponsors et fournisseurs de prix :** des totaux uniquement, comme le nombre d’inscrits. Ils ne reçoivent de notre part ni votre nom, ni vos coordonnées, ni vos notes.',
      '**Les moteurs de recherche :** votre page de profil est marquée pour qu’ils ne la référencent pas, sauf si vous activez son réglage « Moteurs de recherche ». La page d’un projet n’est référencée que si son équipe l’active. Les pages des hackathons et des organisations sont publiques et peuvent être référencées.',
    ]),
    subheading('Base légale et fermeture du compte'),
    ...text(
      'L’inscription, les équipes, les dépôts, l’évaluation et les attestations reposent sur l’exécution de notre contrat. La publication de vos compétences, de vos liens, de ce à quoi vous êtes ouvert et de votre parcours en hackathon repose sur votre consentement explicite, que vous pouvez retirer en désactivant le réglage. Les signalements et les décisions de disqualification reposent sur notre intérêt légitime à protéger la compétition.',
      'Lorsque vous fermez votre compte, nous supprimons vos inscriptions, vos places dans les équipes, comme mentor et sur les projets, vos adhésions à des organisations et vos attestations. Les dépôts et les résultats restent au nom de l’équipe, pas au vôtre, et les notes d’un membre du jury restent sans son nom.',
    ),
  ],
);
