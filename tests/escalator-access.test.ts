import {describe,it,expect} from 'vitest';
import {accessWarnings} from '../src/escalator/access';
import {experienceCopy} from '../src/escalator/experience-copy';
import {PUZZLES} from '../src/escalator/puzzles';
import type {Piece,Puzzle} from '../src/escalator/model';
const pieces:Piece[]=[{id:'p1',type:'short',a:{x:0,y:0},b:{x:1,y:1}}];
const puzzle:Puzzle={...PUZZLES[0],lowCeilings:[{x:.3,y:.2,w:.3,h:.4}]};
const request={...puzzle.requests[0],start:{x:0,y:0},goal:{x:1,y:1}};
describe('actionable access explanations',()=>{
 it('identifies a completed route blocked specifically by steps or headroom',()=>{
  expect(accessWarnings(puzzle,pieces,{...request,wheelchair:true})).toEqual({wheelchair:true,balloon:false});
  expect(accessWarnings(puzzle,pieces,{...request,balloon:true})).toEqual({wheelchair:false,balloon:true});
  expect(accessWarnings(puzzle,pieces,{...request,wheelchair:true,balloon:true})).toEqual({wheelchair:true,balloon:true});
 });
 it('does not blame accessibility for an unfinished or usable route',()=>{
  expect(accessWarnings(puzzle,[],{...request,balloon:true})).toEqual({wheelchair:false,balloon:false});
  expect(accessWarnings(puzzle,pieces,request)).toEqual({wheelchair:false,balloon:false});
 });
 it('provides all experience controls and independent access rules in all five languages',()=>{
  expect(Object.keys(experienceCopy)).toHaveLength(5);
  for(const locale of Object.values(experienceCopy)){
   expect(Object.keys(locale)).toEqual(Object.keys(experienceCopy.en));
   for(const text of Object.values(locale))expect(text.trim().length).toBeGreaterThan(0);
  }
 });
});
