#!/usr/bin/env python3
"""Renderize oito vistas WEBP transparentes diretamente dos quatro GLBs originais.

Execucao: python scripts/generate-forest-webp.py
No modo interno, um unico processo Blender importa e fotografa os 4 GLBs.
Os arquivos PNG intermediarios nao entram no repositorio.
"""
from pathlib import Path
import math
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
MODELS = {
    "tree1": ROOT / "assets/models/Objetos/arvore 1.glb",
    "tree2": ROOT / "assets/models/Objetos/arvore 2.glb",
    "tree3": ROOT / "assets/models/Objetos/arvore 3.glb",
    "bush": ROOT / "assets/models/Objetos/arbusto 1.glb",
}
DEST = ROOT / "assets/vegetation/billboards"
ANGLES = 8


def render_in_blender(folder):
    import bpy
    from mathutils import Vector

    for key, filepath in MODELS.items():
        assert filepath.is_file(), "GLB ausente: " + str(filepath)
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=str(filepath))
        meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
        if not meshes:
            raise RuntimeError("GLB sem meshes: " + str(filepath))

        bounds = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
        mins = [min(point[i] for point in bounds) for i in range(3)]
        maxs = [max(point[i] for point in bounds) for i in range(3)]
        center = Vector(tuple((mins[i] + maxs[i]) * .5 for i in range(3)))
        height = maxs[2] - mins[2]
        if height <= .0001:
            raise RuntimeError("GLB sem altura: " + key)
        max_width = max(maxs[0] - mins[0], maxs[1] - mins[1])
        scene = bpy.context.scene
        # Cycles CPU dispensa EGL/GPU em CI headless. Mantem materiais do GLB.
        scene.render.engine = "CYCLES"
        scene.cycles.device = "CPU"
        scene.cycles.samples = 8
        scene.cycles.use_denoising = False
        scene.render.film_transparent = True
        scene.render.image_settings.file_format = "PNG"
        scene.render.image_settings.color_mode = "RGBA"
        scene.render.resolution_x = 256
        scene.render.resolution_y = 384
        scene.render.resolution_percentage = 100
        scene.camera = None
        scene.view_settings.view_transform = "Standard"
        scene.view_settings.look = "Medium High Contrast"
        scene.view_settings.exposure = 0
        scene.view_settings.gamma = 1

        world = bpy.data.worlds.new("world-foliage")
        scene.world = world
        world.use_nodes = True
        background = world.node_tree.nodes.get("Background")
        background.inputs["Color"].default_value = (.65, .73, .82, 1)
        background.inputs["Strength"].default_value = .85
        target = Vector((center.x, center.y, mins[2] + height*.51))
        camera_data = bpy.data.cameras.new("foliage-ortho")
        camera = bpy.data.objects.new("foliage-camera", camera_data)
        scene.collection.objects.link(camera)
        scene.camera = camera
        camera.data.type = "ORTHO"
        # O enquadramento eh constante para todas as oito direcoes de cada GLB.
        camera.data.ortho_scale = max(height*1.19, max_width*1.78)
        scene.render.image_settings.color_depth = "8"
        lamp_data = bpy.data.lights.new("foliage-key", "AREA")
        lamp = bpy.data.objects.new("foliage-key", lamp_data)
        scene.collection.objects.link(lamp)
        lamp.location = center + Vector((height*1.6, -height*2.0, height*2.3))
        lamp.data.energy = 550
        lamp.data.shape = "DISK"
        lamp.data.size = max(4.0, height*2.0)
        direction = target - lamp.location
        lamp.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()

        for i in range(ANGLES):
            phi = i * (2 * math.pi / ANGLES)
            dist = max(height, max_width) * 3.0
            camera.location = target + Vector((math.sin(phi)*dist, math.cos(phi)*dist, dist*.09))
            facing = target - camera.location
            camera.rotation_euler = facing.to_track_quat("-Z", "Y").to_euler()
            scene.render.filepath = str(folder / (key + "-" + str(i) + ".png"))
            bpy.ops.render.render(write_still=True)
            print("Foliage angle:", key, i, flush=True)


def run():
    if "--in-blender" in sys.argv:
        index = sys.argv.index("--out")
        render_in_blender(Path(sys.argv[index+1]))
        return

    from PIL import Image

    DEST.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="forest-webp-") as temporary:
        temp = Path(temporary)
        subprocess.run(["blender", "--background", "--factory-startup", "--python-exit-code", "1",
                        "--python", str(Path(__file__).resolve()), "--",
                        "--in-blender", "--out", str(temp)], check=True)
        for key in MODELS:
            for angle in range(ANGLES):
                png = temp / (key + "-" + str(angle) + ".png")
                target = DEST / (key + "-" + str(angle) + ".webp")
                with Image.open(png) as img:
                    img.convert("RGBA").save(target, "WEBP", quality=83, method=6)
                assert target.stat().st_size > 200, "WEBP vazio: " + str(target)
                print(key, angle, target.stat().st_size, "bytes", flush=True)


if __name__ == "__main__":
    run()
