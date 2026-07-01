// React Flow custom node types + hidden connection handles.
import { Handle, Position } from 'reactflow'
import { C, PROC_W, PROC_H, BOX_W, BOX_H } from '../lib/constants.js'

const SIDES = [
  ['top', Position.Top],
  ['right', Position.Right],
  ['bottom', Position.Bottom],
  ['left', Position.Left],
]

// Four source + four target handles per node so edges can attach to whichever
// side faces the connected node.
function Handles() {
  const els = []
  SIDES.forEach(([name, pos]) => {
    els.push(
      <Handle
        key={name + 's'}
        type="source"
        position={pos}
        id={name + '-s'}
        style={{ opacity: 0, width: 7, height: 7, background: '#000' }}
      />,
    )
    els.push(
      <Handle
        key={name + 't'}
        type="target"
        position={pos}
        id={name + '-t'}
        style={{ opacity: 0, width: 7, height: 7, background: '#000' }}
      />,
    )
  })
  return els
}

export function BoxNode({ data }) {
  return (
    <div
      className="rf-node"
      style={{
        width: BOX_W,
        height: BOX_H,
        background: data.highlight ? C.hi : C.boxBg,
        border: '1px solid ' + (data.highlight ? C.hiB : C.boxBorder),
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '6px 12px',
        fontSize: 13,
        fontWeight: 600,
        color: '#1f2937',
        position: 'relative',
      }}
    >
      <Handles />
      <button
        className="nodedel"
        title="Remove"
        onClick={(e) => {
          e.stopPropagation()
          data.onDelete && data.onDelete()
        }}
      >
        ✕
      </button>
      <span
        onDoubleClick={(e) => {
          e.stopPropagation()
          data.onRename && data.onRename()
        }}
        style={{ cursor: 'text' }}
      >
        {data.label}
      </span>
    </div>
  )
}

export function ProcessNode({ data }) {
  return (
    <div
      className="rf-node"
      style={{
        width: PROC_W,
        height: PROC_H,
        background: '#fff',
        border: '1.5px solid ' + C.procBorder,
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '6px 10px',
        position: 'relative',
        boxShadow: '0 1px 3px rgba(0,0,0,.08)',
      }}
    >
      <Handles />
      {data.code ? (
        <div style={{ fontSize: 12, fontWeight: 700, color: C.procBorder, marginBottom: 1 }}>{data.code}</div>
      ) : null}
      <div
        onDoubleClick={(e) => {
          e.stopPropagation()
          data.onRename && data.onRename()
        }}
        style={{ fontSize: 13, fontWeight: 700, color: '#12324e', cursor: 'text', lineHeight: 1.2 }}
      >
        {data.name}
      </div>
    </div>
  )
}

export function BandNode() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: C.bandBg,
        border: '1px solid ' + C.bandBorder,
        borderRadius: 3,
      }}
    />
  )
}
