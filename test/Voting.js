const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber, getContractFactory, getSigners } = ethers

describe('Voting', () => {
  let contract;
  let accounts;

  const getOwner = () => accounts[0];
  const getOtherAccount = () => accounts[1];
  
  beforeEach(async () => {
    const Voting = await getContractFactory("Voting");
    contract = await Voting.deploy();
    accounts = await getSigners();
  })

  const checkOnlyOwner = (funcName, ...args) => async () => {
    await expect(
      contract.connect(getOtherAccount())[funcName](...args)
    ).to.be.revertedWith('Ownable: caller is not the owner');
  }

  const checkOnlyVoters = async (funcName, ...args) => {
    const errorMessage = "You're not a voter"
    let nonVoterAccount;

    // Loop through accounts (desc) to find a non voter account
    for (const i = accounts.length - 1; i >= 0; i--) {
      try {
        await contract.connect(accounts[i]).getOneProposal(0);
      } catch(error) {
        if (error.reason === errorMessage) {
          nonVoterAccount = accounts[i];
          break;
        }
      }
    }

    // Call the wanted method from the non voter account and check that the expected error is raised
    await expect(
      contract.connect(nonVoterAccount)[funcName](...args)
    ).to.be.revertedWith(errorMessage);
  }

  describe('State', () => {
    describe('startProposalsRegistering', () => {
      it('isOnlyOwner', checkOnlyOwner('startProposalsRegistering'))

      it('should update workflow status', async () => {
        expect(
          await contract.workflowStatus()
        ).to.eql(0);

        await contract.startProposalsRegistering();

        expect(
          await contract.workflowStatus()
        ).to.eql(1);
      })

      it('should emit event', async () => {
        expect(contract.startProposalsRegistering())
          .to.emit(contract, 'WorkflowStatusChange')
          .withArgs(0, 1)
      })

      it('should revert if workflow status is not RegisteringVoters', async () => {
        await contract.startProposalsRegistering();

        await expect(
          contract.startProposalsRegistering()
        ).to.be.revertedWith('Registering proposals cant be started now');
      })
    })

    describe('endProposalsRegistering', () => {
      it('isOnlyOwner', checkOnlyOwner('endProposalsRegistering'))

      it('should revert if workflow status is not ProposalsRegistrationStarted', async () => {
        await expect(
          contract.endProposalsRegistering()
        ).to.be.revertedWith('Registering proposals havent started yet');
      })

      it('should update workflow status', async () => {
        await contract.startProposalsRegistering();

        expect(
          await contract.workflowStatus()
        ).to.eql(1);

        await contract.endProposalsRegistering();

        expect(
          await contract.workflowStatus()
        ).to.eql(2);
      })

      it('should emit event', async () => {
        await contract.startProposalsRegistering();

        expect(contract.endProposalsRegistering())
          .to.emit(contract, 'WorkflowStatusChange')
          .withArgs(1, 2)
      })
    })

    describe('startVotingSession', () => {
      it('isOnlyOwner', checkOnlyOwner('startVotingSession'))

      it('should revert if workflow status is not ProposalsRegistrationEnded', async () => {
        await expect(
          contract.startVotingSession()
        ).to.be.revertedWith('Registering proposals phase is not finished');
      })

      it('should update workflow status', async () => {
        await contract.startProposalsRegistering();
        await contract.endProposalsRegistering();

        expect(
          await contract.workflowStatus()
        ).to.eql(2);

        await contract.startVotingSession();

        expect(
          await contract.workflowStatus()
        ).to.eql(3);
      })

      it('should emit event', async () => {
        await contract.startProposalsRegistering();
        await contract.endProposalsRegistering();

        expect(contract.startVotingSession())
          .to.emit(contract, 'WorkflowStatusChange')
          .withArgs(2, 3)
      })
    })

    describe('endVotingSession', () => {
      it('isOnlyOwner', checkOnlyOwner('endVotingSession'))

      it('should revert if workflow status is not VotingSessionStarted', async () => {
        await expect(
          contract.endVotingSession()
        ).to.be.revertedWith('Voting session havent started yet');
      })

      it('should update workflow status', async () => {
        await contract.startProposalsRegistering();
        await contract.endProposalsRegistering();
        await contract.startVotingSession();

        expect(
          await contract.workflowStatus()
        ).to.eql(3);

        await contract.endVotingSession();

        expect(
          await contract.workflowStatus()
        ).to.eql(4);
      })

      it('should emit event', async () => {
        await contract.startProposalsRegistering();
        await contract.endProposalsRegistering();
        await contract.startVotingSession();

        expect(contract.endVotingSession())
          .to.emit(contract, 'WorkflowStatusChange')
          .withArgs(3, 4)
      })
    })

    describe('tallyVotes', () => {
      it('isOnlyOwner', checkOnlyOwner('tallyVotes'))

      it('should revert if workflow status is not VotingSessionStarted', async () => {
        await expect(
          contract.tallyVotes()
        ).to.be.revertedWith('Current status is not voting session ended');
      })

      it('should update workflow status', async () => {
        await contract.startProposalsRegistering();
        await contract.endProposalsRegistering();
        await contract.startVotingSession();
        await contract.endVotingSession();

        expect(
          await contract.workflowStatus()
        ).to.eql(4);

        await contract.tallyVotes();

        expect(
          await contract.workflowStatus()
        ).to.eql(5);
      })

      it('should emit event', async () => {
        await contract.startProposalsRegistering();
        await contract.endProposalsRegistering();
        await contract.startVotingSession();
        await contract.endVotingSession();

        expect(contract.tallyVotes())
          .to.emit(contract, 'WorkflowStatusChange')
          .withArgs(4, 5)
      })

      it('should update winningProposalID', async () => {
        expect(
          await contract.winningProposalID()
        ).to.eql(BigNumber.from(0));

        await contract.addVoter(accounts[0].address);
        await contract.addVoter(getOtherAccount().address);
        await contract.addVoter(accounts[2].address);

        await contract.startProposalsRegistering();

        await contract.addProposal('admin');
        await contract.connect(getOtherAccount()).addProposal('voter 1');
        await contract.connect(accounts[2]).addProposal('voter 1');

        await contract.endProposalsRegistering();
        await contract.startVotingSession();

        await contract.setVote(1);
        await contract.connect(getOtherAccount()).setVote(1);
        await contract.connect(accounts[2]).setVote(2);

        await contract.endVotingSession();
        await contract.tallyVotes();

        expect(
          await contract.winningProposalID()
        ).to.eql(BigNumber.from(1));
      })
    })
  })

  describe('Registration', () => {
    describe('addVoter', () => {
      it('isOnlyOwner', () => { checkOnlyOwner('addVoter', getOtherAccount().address)(); })

      it('should revert if workflow status is not RegisteringVoters', async () => {  
        await contract.startProposalsRegistering();
    
        await expect(
          contract.addVoter(getOtherAccount().address)
        ).to.be.revertedWith('Voters registration is not open yet');
      });

      it('should revert if voter is already registered', async () => {
        await contract.addVoter(getOtherAccount().address);

        await expect(
          contract.addVoter(getOtherAccount().address)
        ).to.be.revertedWith('Already registered');
      });

      it('should add voter', async () => {
        await expect(contract.addVoter(getOtherAccount().address))
          .to.emit(contract, 'VoterRegistered')
          .withArgs(getOtherAccount().address)

        const voter = await contract.connect(getOtherAccount()).getVoter(getOtherAccount().address);
        const [isRegistered] = voter;
        expect(isRegistered).to.be.true;
      })
    })
  })

  describe('Proposal', () => {
    describe('addProposal', () => {
      it('isOnlyVoters', () => { checkOnlyVoters('addProposal', 'test'); })

      it('should revert if workflow status is not ProposalsRegistrationStarted', async () => {      
        const [_, account1] = await getSigners();
        await contract.addVoter(getOtherAccount().address);

        await expect(
          contract.connect(getOtherAccount()).addProposal('test')
        ).to.be.revertedWith('Proposals are not allowed yet');
      });

      it('should revert if proposal is empty', async () => {

        await contract.addVoter(getOtherAccount().address);
        await contract.startProposalsRegistering();

        await expect(
          contract.connect(getOtherAccount()).addProposal('')
        ).to.be.revertedWith('Vous ne pouvez pas ne rien proposer');
      });

      it('should add proposal', async () => {
        await contract.addVoter(getOtherAccount().address);
        await contract.startProposalsRegistering();

        await expect(contract.connect(getOtherAccount()).addProposal('test'))
          .to.emit(contract, 'ProposalRegistered')
          .withArgs(1);

        const proposal = await contract.connect(getOtherAccount()).getOneProposal(1);
        const [description] = proposal;
        expect(description).to.eql('test');
      })
    })
  })

  describe('Vote', () => {
    describe('setVote', () => {
      it('isOnlyVoters', async () => { checkOnlyVoters('setVote', 1); })

      it('should revert if workflow status is not VotingSessionStarted', async () => {      
        await contract.addVoter(getOtherAccount().address);

        await expect(
          contract.connect(getOtherAccount()).setVote(1)
        ).to.be.revertedWith('Voting session havent started yet');
      })

      it('should revert if proposal is not found', async () => {      
        await contract.addVoter(getOtherAccount().address);

        await contract.startProposalsRegistering();
        await contract.endProposalsRegistering();
        await contract.startVotingSession();
  
        await expect(
          contract.connect(getOtherAccount()).setVote(1)
        ).to.be.revertedWith('Proposal not found');
      })

      it('should revert voter has already voted', async () => {
        await contract.addVoter(getOtherAccount().address);

        await contract.startProposalsRegistering();

        await contract.connect(getOtherAccount()).addProposal('test');

        await contract.endProposalsRegistering();
        await contract.startVotingSession();

        await contract.connect(getOtherAccount()).setVote(1);
  
        await expect(
          contract.connect(getOtherAccount()).setVote(1)
        ).to.be.revertedWith('You have already voted');
      })

      it('should add vote', async () => {
        await contract.addVoter(getOtherAccount().address);

        await contract.startProposalsRegistering();

        await contract.connect(getOtherAccount()).addProposal('test');

        await contract.endProposalsRegistering();
        await contract.startVotingSession();

        await expect(contract.connect(getOtherAccount()).setVote(1))
          .to.emit(contract, 'Voted')
          .withArgs(getOtherAccount().address, 1);
      })
    })
  })

  describe('Getters', () => {
    describe('getVoter', () => {
      it('should revert if not voter', async () => {
        checkOnlyVoters('getVoter', getOwner().address);
        await expect(
          contract.getVoter(getOwner().address)
        ).to.be.revertedWith("You're not a voter");
      })

      it('should return voter', async () => {
        await contract.addVoter(getOtherAccount().address)

        const voter1 = await contract.connect(getOtherAccount()).getVoter(getOwner().address);
        const [isRegistered1] = voter1;

        expect(isRegistered1).to.be.false;

        const voter2 = await contract.connect(getOtherAccount()).getVoter(getOtherAccount().address);
        const [isRegistered2] = voter2;

        expect(isRegistered2).to.be.true;
      })
    })

    describe('getOneProposal', () => {
      it('should revert if not voter', async () => {
        await expect(
          contract.getOneProposal(getOwner().address)
        ).to.be.revertedWith("You're not a voter");
      })

      it('should return proposal', async () => {
        await contract.addVoter(getOtherAccount().address);
        await contract.startProposalsRegistering();
        await contract.connect(getOtherAccount()).addProposal('test');

        await expect(
          contract.connect(getOtherAccount()).getOneProposal(50)
        ).to.be.reverted

        const prop = await contract.connect(getOtherAccount()).getOneProposal(1);
        const [description] = prop;

        expect(description).to.eq('test');
      })
    })
  })
})