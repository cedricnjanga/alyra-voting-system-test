# Voting System unit tests

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a script that deploys that contract.

You can run the following commands

```shell
# Run all the Voting contract tests
npm test

# Indicate Voting contract test coverage
npm run coverage
```

Specs list :
```shell
Voting
    State
      startProposalsRegistering
        ✔ isOnlyOwner
        ✔ should update workflow status
        ✔ should emit event
        ✔ should revert if workflow status is not RegisteringVoters
      endProposalsRegistering
        ✔ isOnlyOwner
        ✔ should revert if workflow status is not ProposalsRegistrationStarted
        ✔ should update workflow status
        ✔ should emit event
      startVotingSession
        ✔ isOnlyOwner
        ✔ should revert if workflow status is not ProposalsRegistrationEnded
        ✔ should update workflow status
        ✔ should emit event
      endVotingSession
        ✔ isOnlyOwner
        ✔ should revert if workflow status is not VotingSessionStarted
        ✔ should update workflow status
        ✔ should emit event
      tallyVotes
        ✔ isOnlyOwner
        ✔ should revert if workflow status is not VotingSessionStarted
        ✔ should update workflow status
        ✔ should emit event
        ✔ should update winningProposalID
    Registration
      addVoter
        ✔ isOnlyOwner
        ✔ should revert if workflow status is not RegisteringVoters
        ✔ should revert if voter is already registered
        ✔ should add voter
    Proposal
      addProposal
        ✔ isOnlyVoters
        ✔ should revert if workflow status is not ProposalsRegistrationStarted
        ✔ should revert if proposal is empty
        ✔ should add proposal
    Vote
      setVote
        ✔ isOnlyVoters
        ✔ should revert if workflow status is not VotingSessionStarted
        ✔ should revert if proposal is not found
        ✔ should revert voter has already voted
        ✔ should add vote
    Getters
      getVoter
        ✔ isOnlyVoters
        ✔ should return voter
      getOneProposal
        ✔ isOnlyVoters
        ✔ should return proposal
```