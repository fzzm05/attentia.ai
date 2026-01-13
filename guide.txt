ONLY MODEL TRAINED ON SIMULATED CHILD EXISTS FOR NOW

STATE DESCRIPTION

Emotions used in the simulation and the SW will be discrete values-
- neutral 0
- angry 1
- happy 2
- sad 3
- agitated/afraid/anxious 4

"noise" will be a discrete value. it will be modelled into distraction and emotion
0 means the sample difference test says acceptable i.e. negligible difference from when the session started 
1 points to sufficient difference in noise levels from before, potentially pointing to agitation by the child.
2 means high difference, meaning huge agitation
we need to decide the percentages of difference in means/variance for 0,1,2

"distracted" will be between 0,1,2,3,4. Unaddressed distraction could have a 20% chance of increasing distraction each time step

current gain capability- simple increasing difficulty shouldn't increase knowledge gain. the child's skill level matters. gain capability will be known to the model, and will be updated on the basis of tests. discrete integer

ACTION DESCRIPTION (add description for actions along with possible outcomes)

note for when explaining to sir: these assumptions for the effects of actions could be known more accurately after experiments and surveys which we cannot do rn

bring back attention to screen using a series of animations etc
    could also soothe emotion maybe?
    a lower level could bring attention back to screen, higher level risks distracting more
play calming music to calm emotion
    could soothe emotion, but distract from studies

decrease difficulty
increase difficulty
    higher difficulty would mean higher chance of distraction, higher chance of agitation, but higher knowledge gain
    vice versa for decreasing difficulty

CHILD PERSONALITY 
	emotional rigidity- higher rigidity means lower chance of effector to affect emotion
	distraction susceptibility- how likely child is to be distracter
