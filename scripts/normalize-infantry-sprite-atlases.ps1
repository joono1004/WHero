param(
  [string]$SourceDirectory = "$PSScriptRoot\..\public\art\units\infantry-frames",
  [string]$OutputDirectory = "$PSScriptRoot\..\public\art\units\infantry-frames"
)

Add-Type -AssemblyName System.Drawing

$normalizer = @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public sealed class InfantryAtlasNormalizer {
  private sealed class Component {
    public int Count, MinX = int.MaxValue, MinY = int.MaxValue, MaxX = -1, MaxY = -1;
    public long SumX, SumY;
    public readonly List<int> Pixels = new List<int>();
    public void Add(int index, int x, int y) { Count++; Pixels.Add(index); SumX += x; SumY += y; if (x < MinX) MinX = x; if (x > MaxX) MaxX = x; if (y < MinY) MinY = y; if (y > MaxY) MaxY = y; }
    public float CenterX { get { return (float)SumX / Count; } }
    public float CenterY { get { return (float)SumY / Count; } }
  }

  private static List<Component> Components(Bitmap source) {
    using (var argb = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb)) {
      using (var g = Graphics.FromImage(argb)) g.DrawImageUnscaled(source, 0, 0);
      var rect = new Rectangle(0, 0, argb.Width, argb.Height);
      var data = argb.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      var bytes = new byte[Math.Abs(data.Stride) * argb.Height];
      Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);
      argb.UnlockBits(data);
      var width = argb.Width; var height = argb.Height;
      var opaque = new bool[width * height];
      for (var y = 0; y < height; y++) for (var x = 0; x < width; x++) opaque[y * width + x] = bytes[y * data.Stride + x * 4 + 3] > 12;
      var seen = new bool[opaque.Length]; var found = new List<Component>(); var queue = new Queue<int>();
      for (var index = 0; index < opaque.Length; index++) {
        if (!opaque[index] || seen[index]) continue;
        var component = new Component(); seen[index] = true; queue.Enqueue(index);
        while (queue.Count > 0) {
          var point = queue.Dequeue(); var x = point % width; var y = point / width; component.Add(point, x, y);
          for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
            if (dx == 0 && dy == 0) continue; var nx = x + dx; var ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            var next = ny * width + nx; if (!opaque[next] || seen[next]) continue; seen[next] = true; queue.Enqueue(next);
          }
        }
        if (component.Count > 180) found.Add(component);
      }
      return found;
    }
  }

  public static void Normalize(string sourcePath, string outputPath, int columns, int rows) {
    using (var source = (Bitmap)Image.FromFile(sourcePath)) {
      var components = Components(source); const int cellWidth = 320; const int cellHeight = 360;
      using (var target = new Bitmap(columns * cellWidth, rows * cellHeight, PixelFormat.Format32bppArgb))
      using (var graphics = Graphics.FromImage(target)) {
        graphics.Clear(Color.Transparent); graphics.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
        for (var row = 0; row < rows; row++) for (var column = 0; column < columns; column++) {
          var left = source.Width * column / (float)columns; var right = source.Width * (column + 1) / (float)columns;
          var top = source.Height * row / (float)rows; var bottom = source.Height * (row + 1) / (float)rows;
          Component candidate = null;
          foreach (var item in components) if (item.CenterX >= left && item.CenterX < right && item.CenterY >= top && item.CenterY < bottom && (candidate == null || item.Count > candidate.Count)) candidate = item;
          if (candidate == null) throw new InvalidOperationException("Frame component missing at " + column + "," + row);
          var sourceRect = new Rectangle(candidate.MinX, candidate.MinY, candidate.MaxX - candidate.MinX + 1, candidate.MaxY - candidate.MinY + 1);
          var scale = Math.Min(292f / sourceRect.Width, 322f / sourceRect.Height);
          var drawWidth = (int)Math.Round(sourceRect.Width * scale); var drawHeight = (int)Math.Round(sourceRect.Height * scale);
          var drawX = column * cellWidth + (cellWidth - drawWidth) / 2; var drawY = row * cellHeight + cellHeight - 22 - drawHeight;
          using (var isolated = new Bitmap(sourceRect.Width, sourceRect.Height, PixelFormat.Format32bppArgb)) {
            foreach (var point in candidate.Pixels) {
              var sourceX = point % source.Width; var sourceY = point / source.Width;
              isolated.SetPixel(sourceX - sourceRect.X, sourceY - sourceRect.Y, source.GetPixel(sourceX, sourceY));
            }
            graphics.DrawImage(isolated, new Rectangle(drawX, drawY, drawWidth, drawHeight));
          }
        }
        target.Save(outputPath, ImageFormat.Png);
      }
    }
  }
}
'@

Add-Type -TypeDefinition $normalizer -Language CSharp -ReferencedAssemblies ([System.Drawing.Bitmap].Assembly.Location)
New-Item -ItemType Directory -Force $OutputDirectory | Out-Null
$sets = @(
  @{ Input = "ready-v1.png"; Output = "ready-v2.png"; Rows = 3 },
  @{ Input = "move-v1.png"; Output = "move-v2.png"; Rows = 3 },
  @{ Input = "attack-v1.png"; Output = "attack-v2.png"; Rows = 6 },
  @{ Input = "hurt-v1.png"; Output = "hurt-v2.png"; Rows = 3 },
  @{ Input = "death-v1.png"; Output = "death-v2.png"; Rows = 3 }
)

foreach ($set in $sets) {
  [InfantryAtlasNormalizer]::Normalize((Join-Path $SourceDirectory $set.Input), (Join-Path $OutputDirectory $set.Output), 6, $set.Rows)
}
