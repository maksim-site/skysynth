"""Build a deterministic SKS gallery carousel in Blender.

The room and camera stay fixed. Four physical stands move one quarter-turn to
the left while their exact GLB boards travel with them. Run a still first:

    Blender --background --python scripts/blender-gallery-transition.py

Add ``-- --animation`` to render the two-second MP4 after the framing is
approved locally.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = PROJECT_ROOT / "public/assets/video/blender-gallery-right-v1"
MODELS_DIR = PROJECT_ROOT / "public/assets/models"
BACKGROUND_PATH = PROJECT_ROOT / "public/assets/video/gallery-kling-empty.png"
BLEND_PATH = OUTPUT_DIR / "gallery-carousel-right-v1.blend"
STILL_PATH = OUTPUT_DIR / "gallery-carousel-right-v1-preview.png"
VIDEO_PATH = OUTPUT_DIR / "gallery-carousel-right-v1.mp4"

FRAME_START = 1
FRAME_END = 61
FPS = 30
RENDER_ANIMATION = "--animation" in sys.argv


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def material_principled(
    name: str,
    color: tuple[float, float, float, float],
    metallic: float,
    roughness: float,
    emission_color: tuple[float, float, float, float] | None = None,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.diffuse_color = color
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = color
    principled.inputs["Metallic"].default_value = metallic
    principled.inputs["Roughness"].default_value = roughness
    if emission_color is not None:
        emission_input = principled.inputs.get("Emission Color") or principled.inputs.get("Emission")
        if emission_input:
            emission_input.default_value = emission_color
        strength_input = principled.inputs.get("Emission Strength")
        if strength_input:
            strength_input.default_value = emission_strength
    return material


def perforated_material(name: str, lightness: float = 0.016) -> bpy.types.Material:
    """Dark brushed metal with a procedural grid of recessed round holes."""
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()

    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    shader.inputs["Metallic"].default_value = 0.72
    shader.inputs["Roughness"].default_value = 0.35

    texcoord = nodes.new("ShaderNodeTexCoord")
    separate = nodes.new("ShaderNodeSeparateXYZ")
    links.new(texcoord.outputs["Generated"], separate.inputs["Vector"])

    def grid_axis(source, count: float):
        multiply = nodes.new("ShaderNodeMath")
        multiply.operation = "MULTIPLY"
        multiply.inputs[1].default_value = count
        fract = nodes.new("ShaderNodeMath")
        fract.operation = "FRACT"
        subtract = nodes.new("ShaderNodeMath")
        subtract.operation = "SUBTRACT"
        subtract.inputs[1].default_value = 0.5
        square = nodes.new("ShaderNodeMath")
        square.operation = "MULTIPLY"
        links.new(source, multiply.inputs[0])
        links.new(multiply.outputs[0], fract.inputs[0])
        links.new(fract.outputs[0], subtract.inputs[0])
        links.new(subtract.outputs[0], square.inputs[0])
        links.new(subtract.outputs[0], square.inputs[1])
        return square.outputs[0]

    x_square = grid_axis(separate.outputs["X"], 46.0)
    y_square = grid_axis(separate.outputs["Y"], 30.0)
    distance = nodes.new("ShaderNodeMath")
    distance.operation = "ADD"
    links.new(x_square, distance.inputs[0])
    links.new(y_square, distance.inputs[1])

    circle = nodes.new("ShaderNodeMath")
    circle.operation = "LESS_THAN"
    circle.inputs[1].default_value = 0.065
    links.new(distance.outputs[0], circle.inputs[0])

    mix = nodes.new("ShaderNodeMixRGB")
    mix.blend_type = "MIX"
    mix.inputs[1].default_value = (lightness, lightness * 1.12, lightness * 1.18, 1)
    mix.inputs[2].default_value = (0.0015, 0.0018, 0.002, 1)
    links.new(circle.outputs[0], mix.inputs[0])
    links.new(mix.outputs[0], shader.inputs["Base Color"])

    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.28
    bump.inputs["Distance"].default_value = -0.08
    links.new(circle.outputs[0], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], shader.inputs["Normal"])
    links.new(shader.outputs[0], output.inputs[0])
    return material


def add_beveled_cylinder(
    name: str,
    radius: float,
    depth: float,
    vertices: int,
    z: float,
    material: bpy.types.Material,
    bevel: float = 0.06,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=(0, 0, z),
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    bevel_modifier = obj.modifiers.new("Edge softness", "BEVEL")
    bevel_modifier.width = bevel
    bevel_modifier.segments = 3
    return obj


def create_stand(name: str, materials: dict[str, bpy.types.Material]) -> bpy.types.Object:
    root = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(root)

    base = add_beveled_cylinder(
        f"{name}-octagonal-base", 1.72, 0.34, 8, 0.17, materials["base"], 0.08
    )
    lower = add_beveled_cylinder(
        f"{name}-lower-disc", 1.48, 0.17, 96, 0.43, materials["base"], 0.045
    )
    ring = add_beveled_cylinder(
        f"{name}-gold-ring", 1.42, 0.09, 96, 0.55, materials["gold"], 0.03
    )
    top = add_beveled_cylinder(
        f"{name}-perforated-top", 1.34, 0.16, 96, 0.64, materials["top"], 0.035
    )
    inset = add_beveled_cylinder(
        f"{name}-top-inset", 1.19, 0.025, 96, 0.735, materials["top"], 0.015
    )
    for part in (base, lower, ring, top, inset):
        part.parent = root
        part.select_set(False)
    return root


def mesh_world_bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    corners: list[Vector] = []
    for obj in objects:
        if obj.type != "MESH":
            continue
        corners.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    if not corners:
        return Vector((-1, -1, -1)), Vector((1, 1, 1))
    minimum = Vector((min(p.x for p in corners), min(p.y for p in corners), min(p.z for p in corners)))
    maximum = Vector((max(p.x for p in corners), max(p.y for p in corners), max(p.z for p in corners)))
    return minimum, maximum


def import_board(model_path: Path, name: str, target_size: float = 2.2) -> bpy.types.Object:
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(model_path))
    imported = [obj for obj in bpy.context.scene.objects if obj not in before]
    imported_set = set(imported)
    roots = [obj for obj in imported if obj.parent not in imported_set]

    source_root = bpy.data.objects.new(f"{name}-source", None)
    bpy.context.collection.objects.link(source_root)
    for obj in roots:
        obj.parent = source_root

    bpy.context.view_layer.update()
    meshes = [obj for obj in imported if obj.type == "MESH"]
    minimum, maximum = mesh_world_bounds(meshes)
    size = maximum - minimum
    center = (minimum + maximum) * 0.5
    longest = max(size.x, size.y, size.z, 0.001)
    thin_axis = min(range(3), key=lambda axis: size[axis])

    source_root.location = -center
    source_root.scale = (target_size / longest,) * 3
    # The camera looks broadly along +Y. Turn the thinnest model dimension onto
    # Y so the board face remains frontal and never receives a 2D stretch.
    if thin_axis == 2:
        source_root.rotation_euler.x = math.radians(90)
    elif thin_axis == 0:
        source_root.rotation_euler.z = math.radians(90)

    holder = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(holder)
    source_root.parent = holder
    holder.location.z = 2.0
    holder.rotation_euler = (math.radians(-5), 0, math.radians(8))

    for mesh in meshes:
        mesh.select_set(False)
        mesh.visible_shadow = True
        for material in mesh.data.materials:
            if material and material.use_nodes:
                principled = material.node_tree.nodes.get("Principled BSDF")
                if principled:
                    principled.inputs["Roughness"].default_value = max(
                        0.28, min(0.48, principled.inputs["Roughness"].default_value)
                    )
    return holder


def look_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_background_plane(material: bpy.types.Material) -> bpy.types.Object:
    bpy.ops.mesh.primitive_plane_add(size=2, location=(0, 12.5, 5.3), rotation=(math.pi / 2, 0, 0))
    plane = bpy.context.object
    plane.name = "Accepted laboratory backdrop"
    plane.scale = (9.75, 5.5, 1)
    plane.data.materials.append(material)
    return plane


def build_background_material() -> bpy.types.Material:
    material = bpy.data.materials.new("Accepted lab plate")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    emission = nodes.new("ShaderNodeEmission")
    emission.inputs["Strength"].default_value = 0.48
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = bpy.data.images.load(str(BACKGROUND_PATH), check_existing=True)
    links.new(texture.outputs["Color"], emission.inputs["Color"])
    links.new(emission.outputs[0], output.inputs[0])
    return material


def animate_quarter_turn(root: bpy.types.Object, start_angle: float) -> None:
    center_y = 2.7
    radius_x = 4.25
    radius_y = 3.5
    for frame in range(FRAME_START, FRAME_END + 1):
        linear = (frame - FRAME_START) / (FRAME_END - FRAME_START)
        eased = 0.5 - 0.5 * math.cos(math.pi * linear)
        angle = start_angle - (math.pi / 2) * eased
        root.location.x = radius_x * math.cos(angle)
        root.location.y = center_y + radius_y * math.sin(angle)
        root.location.z = 0
        root.rotation_euler.z = math.radians(2.5) * math.sin(math.pi * linear)
        root.keyframe_insert(data_path="location", frame=frame)
        root.keyframe_insert(data_path="rotation_euler", frame=frame)


def add_area_light(name: str, location, energy: float, size: float, color) -> None:
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = color
    light = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(light)
    light.location = location
    look_at(light, (0, 2.4, 0.2))


def build_scene() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    clear_scene()
    scene = bpy.context.scene
    scene.frame_start = FRAME_START
    scene.frame_end = FRAME_END
    scene.render.fps = FPS
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.look = "AgX - Medium High Contrast"

    world = scene.world or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.0015, 0.002, 0.0025, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.13

    materials = {
        "base": material_principled("Graphite stand", (0.012, 0.014, 0.016, 1), 0.76, 0.24),
        "top": perforated_material("Perforated graphite", 0.025),
        "gold": material_principled(
            "Warm copper light",
            (0.34, 0.12, 0.025, 1),
            0.68,
            0.22,
            (1.0, 0.29, 0.035, 1),
            5.0,
        ),
        "floor": perforated_material("Perforated optical table", 0.012),
    }

    bpy.ops.mesh.primitive_cube_add(location=(0, 4.0, -0.2), scale=(10.5, 9.5, 0.2))
    floor = bpy.context.object
    floor.name = "Optical table"
    floor.data.materials.append(materials["floor"])
    bevel = floor.modifiers.new("Table edge softness", "BEVEL")
    bevel.width = 0.12
    bevel.segments = 4

    add_background_plane(build_background_material())

    models = [
        ("Flight controller", MODELS_DIR / "flight-controller.glb"),
        ("CAN to PWM", MODELS_DIR / "can-to-pwm.glb"),
        ("Power distribution", MODELS_DIR / "power-distribution.glb"),
        ("ICM 42605", MODELS_DIR / "icm-42605.glb"),
    ]
    start_angles = [-math.pi / 2, 0, math.pi / 2, math.pi]
    for index, ((board_name, model_path), angle) in enumerate(zip(models, start_angles), start=1):
        carousel_root = bpy.data.objects.new(f"Carousel position {index}", None)
        bpy.context.collection.objects.link(carousel_root)
        stand = create_stand(f"Stand {index}", materials)
        board = import_board(model_path, board_name)
        stand.parent = carousel_root
        board.parent = carousel_root
        board.rotation_euler.z += math.radians((index - 2.5) * 3.0)
        animate_quarter_turn(carousel_root, angle)

    camera_data = bpy.data.cameras.new("Locked camera")
    camera = bpy.data.objects.new("Locked camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (0, -12.8, 6.1)
    camera_data.lens = 48
    camera_data.sensor_width = 36
    look_at(camera, (0, 2.45, 0.85))
    scene.camera = camera

    add_area_light("Warm key", (-4.2, -3.6, 8.5), 1500, 5.0, (1.0, 0.72, 0.42))
    add_area_light("Cool fill", (5.8, 0.2, 5.8), 820, 4.0, (0.44, 0.62, 0.72))
    add_area_light("Top softbox", (0, 5.0, 10.5), 1900, 6.0, (1.0, 0.9, 0.72))

    scene.frame_set(FRAME_START)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))


def render() -> None:
    scene = bpy.context.scene
    if RENDER_ANIMATION:
        scene.render.image_settings.file_format = "FFMPEG"
        scene.render.ffmpeg.format = "MPEG4"
        scene.render.ffmpeg.codec = "H264"
        scene.render.ffmpeg.constant_rate_factor = "MEDIUM"
        scene.render.ffmpeg.ffmpeg_preset = "GOOD"
        scene.render.filepath = str(VIDEO_PATH)
        bpy.ops.render.render(animation=True)
    else:
        scene.render.image_settings.file_format = "PNG"
        scene.render.filepath = str(STILL_PATH)
        bpy.ops.render.render(write_still=True)


build_scene()
render()
