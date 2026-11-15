import bpy, math
from mathutils import Vector

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, metallic=0, roughness=.4, emission=None, strength=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Metallic'].default_value=metallic
    bs.inputs['Roughness'].default_value=roughness
    if emission:
        bs.inputs['Emission Color'].default_value=(*emission,1)
        bs.inputs['Emission Strength'].default_value=strength
    return m

graphite=material('Graphite brushed metal',(.035,.052,.071),.8,.32)
black=material('Matte dark panels',(.012,.02,.032),.25,.42)
steel=material('Titanium trim',(.19,.25,.3),.85,.28)
cyan=material('Soft cyan illumination',(.015,.23,.38),.25,.3,(.02,.55,.95),2)
blue=material('Navigation display',(.008,.04,.085),.1,.22,(.012,.1,.22),.6)
amber=material('Amber status indicators',(.55,.21,.035),.15,.3,(1,.33,.035),1.2)

def cylinder(name, radius, depth, z, mat, vertices=96, radius2=None):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=radius if radius2 is None else radius2, depth=depth, location=(0,0,z))
    o=bpy.context.object;o.name=name;o.data.materials.append(mat)
    bevel=o.modifiers.new('Soft machined edges','BEVEL');bevel.width=.025;bevel.segments=2
    o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o

def torus(name, major, minor, z, mat):
    bpy.ops.mesh.primitive_torus_add(major_segments=96, minor_segments=12, location=(0,0,z), major_radius=major, minor_radius=minor)
    o=bpy.context.object;o.name=name;o.data.materials.append(mat)
    return o

def cube(name, location, scale, mat, bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    o=bpy.context.object;o.name=name;o.dimensions=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat)
    if bevel:
        b=o.modifiers.new('Machined edge','BEVEL');b.width=bevel;b.segments=2
        o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o

# Console base: low, wide, architectural circular command table
cylinder('01 | Recessed lower plinth',1.58,.16,.12,black)
cylinder('02 | Angled structural pedestal',1.35,.48,.43,graphite,radius2=1.49)
cylinder('03 | Metallic upper rim',1.62,.11,.74,steel)
cylinder('04 | Dark control deck',1.54,.07,.81,graphite)
torus('05 | Outer cyan light channel',1.48,.014,.858,cyan)
torus('06 | Inner precision trim',.82,.016,.861,steel)
cylinder('07 | Central recessed screen',.78,.025,.853,blue)
torus('08 | Central navigation ring',.71,.013,.872,cyan)
torus('09 | Inner navigation ring',.49,.008,.875,steel)
# Orbit paths and radial navigation marks
for i in range(24):
    a=2*math.pi*i/24
    r=.61
    obj=cube('Navigation tick %02d'%i,(r*math.cos(a),r*math.sin(a),.877),(.07,.012,.006),cyan if i%3==0 else steel,.003)
    obj.rotation_euler[2]=a
# Raised center globe with orbital rings
bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=20, radius=.25, location=(0,0,1.16))
globe=bpy.context.object;globe.name='Earth navigation globe';globe.data.materials.append(blue)
bpy.ops.object.shade_smooth()
for i in range(2):
    ring=torus('Earth orbit ring %d'%i,.36,.009,1.16,cyan if i==0 else steel)
    ring.rotation_euler=(math.radians(60+i*35),math.radians(i*25),math.radians(20+i*50))
# Eight angled touchscreen modules around the circular deck
for i in range(8):
    a=2*math.pi*i/8
    x,y=1.13*math.cos(a),1.13*math.sin(a)
    panel=cube('Control panel %d housing'%i,(x,y,.93),(.58,.36,.10),black,.022)
    panel.rotation_euler[2]=a-math.pi/2
    display=cube('Control panel %d illuminated screen'%i,(x,y,.988),(.49,.27,.008),blue,.01)
    display.rotation_euler[2]=a-math.pi/2
    for j in range(4):
        dx=(j-1.5)*.10
        bx=x+dx*math.cos(a-math.pi/2)
        by=y+dx*math.sin(a-math.pi/2)
        key=cube('Panel %d status bar %d'%(i,j),(bx,by,.996),(.055,.025,.006),cyan if j<3 else amber,.002)
        key.rotation_euler[2]=a-math.pi/2
# Vertical support ribs around lower pedestal
for i in range(12):
    a=2*math.pi*i/12
    r=1.4
    rib=cube('Structural rib %02d'%i,(r*math.cos(a),r*math.sin(a),.45),(.11,.07,.39),steel,.012)
    rib.rotation_euler[2]=a
# Display setup only, not exported as part of the GLB
world=bpy.context.scene.world
world.color=(.08,.08,.08)
for pos,power,size in [((3,-4,6),950,5),((-3,2,5),700,4)]:
    bpy.ops.object.light_add(type='AREA',location=pos)
    light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size
    direction=Vector((0,0,.5))-light.location
    light.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
# Select console body for convenient inspection
bpy.ops.object.select_all(action='DESELECT')
bpy.context.view_layer.objects.active=globe
globe.select_set(True)
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_location=(0,0,.6)
            area.spaces.active.region_3d.view_distance=5.7
print('MISSION CONTROL console created! Save .blend first; export console meshes as GLB later.')
