param(
  [string]$GeneratedRoot = "C:\Users\이준호\.codex\generated_images\01a07e5b-f77f-7fa1-98f1-a784c31d3803",
  [string]$OutputDirectory = "$PSScriptRoot\..\public\art\units\infantry-high"
)

Add-Type -AssemblyName System.Drawing

$processor = @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;

public static class InfantryHighFrameBuilder {
  // Generated strips have anti-aliased magenta pixels around the silhouette.
  // Remove that full purple family while retaining the royal-blue faction paint.
  static bool IsMagenta(Color pixel) { return pixel.R > 110 && pixel.B > 125 && pixel.R - pixel.G > 65 && pixel.B - pixel.G > 75; }
  public static void Build(string sourcePath, string outputPath, int frames) {
    using (var source = (Bitmap)Image.FromFile(sourcePath))
    using (var keyed = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb)) {
      for (var y = 0; y < source.Height; y++) for (var x = 0; x < source.Width; x++) {
        var p = source.GetPixel(x, y); keyed.SetPixel(x, y, IsMagenta(p) ? Color.Transparent : p);
      }
      const int frameWidth = 320, frameHeight = 360, footPadding = 22;
      using (var output = new Bitmap(frameWidth, frameHeight * frames, PixelFormat.Format32bppArgb))
      using (var graphics = Graphics.FromImage(output)) {
        graphics.Clear(Color.Transparent); graphics.InterpolationMode = InterpolationMode.HighQualityBicubic; graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
        for (var frame = 0; frame < frames; frame++) {
          var top = source.Height * frame / frames; var bottom = source.Height * (frame + 1) / frames;
          var minX = source.Width; var minY = bottom; var maxX = -1; var maxY = -1;
          for (var y = top; y < bottom; y++) for (var x = 0; x < source.Width; x++) if (keyed.GetPixel(x, y).A > 20) {
            minX = Math.Min(minX, x); minY = Math.Min(minY, y); maxX = Math.Max(maxX, x); maxY = Math.Max(maxY, y);
          }
          if (maxX < minX || maxY < minY) throw new InvalidOperationException("Empty frame " + frame + " in " + sourcePath);
          var sourceRect = Rectangle.FromLTRB(minX, minY, maxX + 1, maxY + 1);
          var scale = Math.Min(292f / sourceRect.Width, 322f / sourceRect.Height);
          var drawWidth = (int)Math.Round(sourceRect.Width * scale); var drawHeight = (int)Math.Round(sourceRect.Height * scale);
          var drawX = (frameWidth - drawWidth) / 2; var drawY = frame * frameHeight + frameHeight - footPadding - drawHeight;
          graphics.DrawImage(keyed, new Rectangle(drawX, drawY, drawWidth, drawHeight), sourceRect, GraphicsUnit.Pixel);
        }
        output.Save(outputPath, ImageFormat.Png);
      }
    }
  }
}
'@

$drawingDirectory = Split-Path ([System.Drawing.Bitmap].Assembly.Location)
$drawingReferences = @(
  [System.Drawing.Bitmap].Assembly.Location,
  [System.Drawing.Color].Assembly.Location,
  (Join-Path $drawingDirectory 'System.Private.Windows.Core.dll'),
  (Join-Path $drawingDirectory 'System.Private.Windows.GdiPlus.dll')
)
Add-Type -TypeDefinition $processor -Language CSharp -ReferencedAssemblies $drawingReferences
New-Item -ItemType Directory -Force $OutputDirectory | Out-Null
$sets = @(
  @{ State='ready'; Frames=6; Sources=@{ 'left-up'='exec-940c3b75-6036-4f6e-9438-f6d119eb3dd2.png'; 'right-up'='exec-dde8b080-6410-4892-9910-cff74ff95f3a.png'; left='exec-5f1b9de4-3523-49a0-9563-5b7f37698f10.png'; right='exec-fd3c1ed4-6b95-475b-b66c-66a98287b1ae.png'; 'left-down'='exec-56d96bbd-200d-4fb4-946e-337ea7ee052f.png'; 'right-down'='exec-58850477-a451-4648-bea9-bd424a60e025.png' } },
  @{ State='move'; Frames=8; Sources=@{ 'left-up'='exec-d366deea-233a-4871-a486-cddaf816a668.png'; 'right-up'='exec-1345ef04-1883-4016-99cc-5ac6f2cf31ed.png'; left='exec-00a4d289-69cb-4ee0-bedc-14bcc917120f.png'; right='exec-95f3d422-c540-47f3-b16b-055b09f13504.png'; 'left-down'='exec-a32fcb6b-593a-4b59-8bac-07046db5f086.png'; 'right-down'='exec-902af077-59c7-4292-9e1f-d7aa11431716.png' } },
  @{ State='attack'; Frames=10; Sources=@{ 'left-up'='exec-0cba0c48-564b-4791-99bb-8b07499a62a8.png'; 'right-up'='exec-380b7058-877e-495e-b346-9c78d64e360e.png'; left='exec-7206b4a6-048c-440e-83e0-ad82592706b5.png'; right='exec-72ad90e8-f056-456f-9d27-6ef8804f2fd2.png'; 'left-down'='exec-1d9fed19-a4fe-49ce-960b-c8d6a828361f.png'; 'right-down'='exec-6bcd05a5-a1e2-47f2-aba5-195080d4ea8d.png' } },
  @{ State='hurt'; Frames=6; Sources=@{ 'left-up'='exec-c0f92c95-c0fc-4049-824e-e04fd917e751.png'; 'right-up'='exec-ec0a2c4b-7438-4d66-a5ce-c6d9a3ab2ac3.png'; left='exec-2621047a-14d3-47b2-80d2-c6cbf261f667.png'; right='exec-f8024561-85e3-4bc3-bebc-857c4a349d28.png'; 'left-down'='exec-aec2e582-7bd9-49b7-9bb7-0e77b9aae9fa.png'; 'right-down'='exec-f9754b6e-0b40-496a-a765-251377c16a6e.png' } },
  @{ State='death'; Frames=6; Sources=@{ 'left-up'='exec-693ba76e-3df4-4295-91f1-7f83c6998e8f.png'; 'right-up'='exec-9cb7e58f-1bc7-42f9-8165-95d9c10f59dd.png'; left='exec-985a53b8-38b8-4114-93d1-68c694e03f35.png'; right='exec-22cd1cc4-c4ca-42ef-aff9-d46a308053e5.png'; 'left-down'='exec-4d6ee05e-3072-4ba3-b0ca-ef33df1c64a6.png'; 'right-down'='exec-178a2cb2-c869-4385-aa4f-eee59639acae.png' } }
)

foreach ($set in $sets) {
  foreach ($direction in $set.Sources.Keys) {
    $source = Join-Path $GeneratedRoot $set.Sources[$direction]
    $output = Join-Path $OutputDirectory "$($set.State)-$direction.png"
    [InfantryHighFrameBuilder]::Build($source, $output, $set.Frames)
  }
}
