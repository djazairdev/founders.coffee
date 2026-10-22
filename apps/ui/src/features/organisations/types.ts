import type { InvitationPage, MyOrganisationPage } from './api';

export type OrganisationRoster = MyOrganisationPage;
export type OrganisationReviewView = MyOrganisationPage['review'];
export type RosterMember = MyOrganisationPage['members'][number];
export type RosterInvitation = MyOrganisationPage['invitations'][number];
export type InvitationView = InvitationPage;
export type OrganisationHackathon = MyOrganisationPage['hackathons'][number];
