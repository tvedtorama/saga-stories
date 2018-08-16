import { ISlideProps } from "../components/Slide";
import { NOP } from "../actions/nop";
import { IStoryRunnerYieldFormat } from "../storyRunner";
import { storeStoryItem } from "../actions/storyItem";

export const slideStoryInnerDefault = function*() {
	yield {}
	while (true)
		yield null
}

/** Slide story, lives on till told to exit.
 *
 * Returns a method that can be called to generate the actual story.
 */
export const slideStoryImpl = <TSlideKey extends string>(idAndParent: {id: string, parentId: string}, internalGen = slideStoryInnerDefault()) =>
	(existenceCheck: (s: StoryAnim.IEventState) => boolean, slideText: string | {s: TSlideKey}, position: StoryAnimDataSchema.IItemPosition = {}, small = false) =>
	function*() {
		const internalGenProps = internalGen.next().value
		const getStoryItemToStore = (internalGenProps) => storeStoryItem({
			position,
			startPosition: position,
			...idAndParent,
			order: 200,
			visual: {
				component: "SLIDE",
				classNameAdd: `taller-on-mobile ${small ? " small-slide" : ""}` ,
				props: (typeof slideText === "string" ? <ISlideProps>{text: slideText} : <ISlideProps>{slide: slideText.s, props: internalGenProps}),
			}
		})
		let state: IStoryRunnerYieldFormat = yield getStoryItemToStore(internalGenProps)
		while (true) {
			const internalGenProps = internalGen.next(state).value
			state = yield internalGenProps ? getStoryItemToStore(internalGenProps) : {type: NOP}
			if (!existenceCheck(state.eventState))
				return
		}
	}
