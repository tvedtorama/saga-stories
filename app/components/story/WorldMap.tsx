
import * as React from 'react'
import { Motion, spring, presets, OpaqueConfig } from 'react-motion';
import { feature } from "topojson-client"
import { GeometryCollection } from "topojson-specification";
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { isUndefined } from '../../../storyAnim/utils/lowLevelUtils';
import { slowSpring, mediumSpring } from '../../../storyAnim/utils/springs';

const worldDataJson = require('../../maps/110m.json')

const worldData = feature(worldDataJson, worldDataJson.objects.countries as GeometryCollection).features

export interface IWorldMapProps {
	selectedHotspot?: number
}

const cityCooridnates: [number, number][] = [
	[-83.045754, 42.331427], // Detroit
	[5.628929, 62.3317447], // Fosnavaag
	[0, 0],
]

const WorldMapContent: React.StatelessComponent<{projection, currentCity, worldData, scale}> = ({projection, currentCity, worldData, scale}) => [
	<g className="countries" key="countries">
		{
			worldData.map((d, i) => (
				<path
					key={`path-${i}`}
					d={geoPath().projection(projection)(d)}
					className="country"
					fill={`rgba(38,50,56,${1 / worldData.length * i})`}
					stroke="#FFFFFF"
					strokeWidth={currentCity ? 0.1 : 0.5}
				/>
			))
		}
	</g>,
	<g className="markers" key="markers">
		{cityCooridnates.
			map(city => ({city, proj: projection(city)})).
			map(({city, proj}) =>
			<circle key={proj[0].toString()}
				cx={proj[0]}
				cy={proj[1]}
				r={6}
				fill="#E91E63"
				className="marker"
		/>)}
	</g>
] as any

const animDefaults = {long: 0, lat: 0, scale: 100}
type IAnimProps = {[index in keyof typeof animDefaults]: OpaqueConfig}

/** Renders a map of the world.
 *
 * Inspired by: https://medium.com/@zimrick/how-to-create-pure-react-svg-maps-with-topojson-and-d3-geo-e4a6b6848a98
  */
export class WorldMap extends React.Component<IWorldMapProps, {worldData: typeof worldData}> {
	constructor(props) {
		super(props)
		this.state = {
			worldData,
		}
	}
	projection(center?: [number, number], scale: number = 100) {
		const base = geoNaturalEarth1()
			.translate([0, 0])
		if (!center)
			return base
		// const translate = base(center)
		return base.center(center).scale(scale) // translate([translate[0], translate[1]])
// 			.scale(250)
	}
	render() {
		const currentCity = isUndefined(this.props.selectedHotspot) ? null : cityCooridnates[this.props.selectedHotspot]
		const animStyles: IAnimProps = currentCity ? {
			long: mediumSpring(currentCity[0]),
			lat: mediumSpring(currentCity[1]),
			scale: slowSpring(1800),
		} :
			{
				long: spring(0), lat: spring(0), scale: spring(100)
			}
		return <Motion defaultStyle={animDefaults} style={animStyles}>{
			({long, lat, scale}) =>
				[this.projection([long, lat], scale)].
				map(projection => <WorldMapContent {...{currentCity, projection, worldData: this.state.worldData, scale}} />)
				[0]}</Motion>
	}
}

