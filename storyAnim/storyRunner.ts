import { take, fork, cancel, put, select } from "redux-saga/effects";
import { SET_EVENT_DATA } from "./actions/eventData";
import { Task } from "redux-saga";
import * as Ix from 'ix'
import { Action } from "redux";

export interface IStoryRunnerYieldFormat {
	eventData: StoryAnim.IEventData
	eventState: StoryAnim.IEventState
}

type IChildrenIterator = IterableIterator<IStoryRunnerProvider[]>
type IEventDataAction = Action & {eventData: StoryAnim.IEventData}
type IStoryIterator =  IterableIterator<any>

export interface IStoryRunnerProvider {
	id: string
	getStory: (es: StoryAnim.IEventState) => IStoryIterator
	/** Returns missing children for the given status, taking a `IStoryRunnerChildrenStatus`.  Should perhps be a
	 * regular function, unless we want to make sure some children are created only once. */
	getChildrenIterator: () => IChildrenIterator
}
export interface IStoryRunnerChildrenStatus {
	running: string[]
	eventState: StoryAnim.IEventState
}

/** Returns something like an action with event data, either from input data or by taking one from redux */
const produceYieldableEventData = function*(eventData?: StoryAnim.IEventData) {
	if (eventData)
		yield Promise.resolve(<IEventDataAction>{eventData})
	while (true) {
		yield take(SET_EVENT_DATA)
	}
}

const getActualRunningChildren = (runningIterators: {[id: string]: Task}) =>
	Object.keys(runningIterators).filter(k => runningIterators[k].isRunning())

/** This is used around the place since generators don't receive anything until they yield,
 * hence we have to call the twice on first iteration. **Bad stuff** */
const takeTwoOnFirst = (isFirst) => Ix.Iterable.range(0, isFirst ? 2 : 1)

/** Calls the children iteratior, two times the first time, to initialize it.
 *
 * Note: We might be better off using a plain function as mentioned somewhere else
 * Note: When done, we get `value === undefined`
 */
const iterateChildrenLister = (childIterator: IChildrenIterator, childrenStatus: IStoryRunnerChildrenStatus, isFirst: boolean): IStoryRunnerProvider[] =>
	takeTwoOnFirst(isFirst).reduce(() => childIterator.next(childrenStatus).value, []) || []

/** Return the story when yielded. This requires the eventState, which is passed in after yield. Hence it
 * will initially yield empty, to get this state.
 * All this to achieve immutability in the main loop. */
const getStoryWhenItsTime = function*(storyData: IStoryRunnerProvider): IterableIterator<IStoryIterator> {
		const eventState: StoryAnim.IEventState = yield null
		const gen = storyData.getStory(eventState)
		while (true)
			yield gen
	}

/** Runs a story and its children. `put`s any actions it dispatches. */
export const storyRunner = function*(storyData: IStoryRunnerProvider, eventData?: StoryAnim.IEventData) {
	const genIterator = getStoryWhenItsTime(storyData)
	const childIterator = storyData.getChildrenIterator()
	const eventDataGenerator = produceYieldableEventData(eventData)
	let runningChildren: {[id: string]: Task} = {}
	for (const iteration of Ix.Iterable.range(0, Number.MAX_SAFE_INTEGER)) {
		const isFirstIteration = iteration === 0
		const {eventData}: IEventDataAction = yield eventDataGenerator.next().value
		const {eventState}: StoryAnimState.IState = yield select()
		const childrenStatus = {
			running: getActualRunningChildren(runningChildren),
			eventState,
		}
		const newChildren = iterateChildrenLister(childIterator, childrenStatus, isFirstIteration)
		for (const child of newChildren)
			runningChildren = {
				...runningChildren,
				[child.id]: yield fork(storyRunner, child, eventData)
			}
		const gen = takeTwoOnFirst(isFirstIteration).map(i => genIterator.next(eventState).value).last()
		const result = gen.next(<IStoryRunnerYieldFormat>{eventState, eventData})
		if (result.done) {
			const running = getActualRunningChildren(runningChildren)
			for (const cancelId of running)
				yield cancel(running[cancelId])
			return
		}
		yield put(result.value)
	}
}
