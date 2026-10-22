export { joinHackathonInterest } from './interest-rpc.js';
export type { JoinHackathonInterestRequest } from './interest-rpc.js';
export type { JoinHackathonInterestResult } from './interest.js';
export { createHackathonDraft } from './draft-rpc.js';
export type { CreateHackathonDraftRequest } from './draft-rpc.js';
export type { HackathonDraftCreated } from './draft.js';
export {
  getHackathonDraft,
  saveHackathonDetails,
  type HackathonDraftRequest,
  type SaveHackathonDetailsRequest,
} from './details-rpc.js';
export type {
  HackathonCriterionView,
  HackathonDetailsView,
  HackathonDraftView,
  HackathonPrizeView,
  HackathonTrackView,
} from './draft-view.js';
export {
  addHackathonPrize,
  changeHackathonPrize,
  removeHackathonPrize,
  saveHackathonRubric,
  saveHackathonTracks,
  type AddHackathonPrizeRequest,
  type ChangeHackathonPrizeRequest,
  type RemoveHackathonPrizeRequest,
  type SaveHackathonRubricRequest,
  type SaveHackathonTracksRequest,
} from './edits-rpc.js';
export { registerForHackathon } from './registration-rpc.js';
export type { RegistrationCreated } from './registration.js';
