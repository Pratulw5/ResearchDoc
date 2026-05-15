# Generated manually to reconcile Paper model changes
# Old schema: file (FileField), metadata (JSONField), no content, no updated_at, no PaperAsset
# New schema: content (TextField), updated_at, PaperAsset model; file/metadata removed

import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('papers', '0002_initial'),  # the migration you just showed
    ]

    operations = [

        # ── 1. Add new columns to papers_paper ────────────────────────────────

        migrations.AddField(
            model_name='paper',
            name='content',
            field=models.TextField(default=''),
        ),
        migrations.AddField(
            model_name='paper',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),

        # ── 2. Change authors from CharField → TextField ───────────────────────
        # (matches the model; safe — TEXT and VARCHAR are compatible in Postgres)

        migrations.AlterField(
            model_name='paper',
            name='authors',
            field=models.TextField(blank=True),
        ),

        # ── 3. Change status default from "pending" → "draft" ─────────────────

        migrations.AlterField(
            model_name='paper',
            name='status',
            field=models.CharField(default='draft', max_length=20),
        ),

        # ── 4. Drop old columns that no longer exist on the model ──────────────

        migrations.RemoveField(
            model_name='paper',
            name='file',
        ),
        migrations.RemoveField(
            model_name='paper',
            name='metadata',
        ),

        # ── 5. Create PaperAsset ───────────────────────────────────────────────

        migrations.CreateModel(
            name='PaperAsset',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('r2_key', models.TextField()),
                ('file_url', models.TextField()),
                ('original_filename', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('paper', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='assets',
                    to='papers.paper',
                )),
            ],
        ),
    ]